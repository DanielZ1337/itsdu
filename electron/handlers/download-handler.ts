import { app, BrowserWindow, ipcMain, shell } from "electron";
import axios from "axios";
import { download } from "electron-dl";
import { AuthService } from "../services/itslearning/auth/auth-service.ts";
import { createScrapeWindow, getCookiesForDomain } from "../../electron/services/scrape/scraper.ts";
import {
    getMicrosoftOfficeDocumentAccessTokenAndUrl,
    getResourceAsFile,
    getResourceDownloadLink,
    getResourceLinkByElementID,
    getSSOLink,
    ITSLEARNING_RESOURCE_URL
} from "../../electron/services/itslearning/resources/resources.ts";
import { VITE_DEV_SERVER_URL } from "../main.ts";
import { getFormattedCookies } from "../utils/cookies.ts";
import { ITSLEARNING_URL } from "../../electron/services/itslearning/itslearning.ts";

const authService = AuthService.getInstance()

export async function openLinkInBrowser(url: string, sso: boolean = true) {
    if (sso) {
        const { data } = await axios.get(`https://sdu.itslearning.com/restapi/personal/sso/url/v1`, {
            params: {
                'access_token': authService.getToken('access_token'),
                'url': url
            }
        })
        url = data.Url
    }

    // open the url with the default browser
    await shell.openExternal(url)
}

function openExternalHandler() {
    ipcMain.handle('app:openExternal', async (_, url, sso) => {
        await openLinkInBrowser(url, sso)
    })
}

function getPathHandler() {
    ipcMain.handle('app:getPath', async (_, path) => {
        return app.getPath(path)
    })

    ipcMain.handle('app:getDownloadPath', async () => {
        return app.getPath('downloads')
    })
}

function openShellHandler() {
    ipcMain.handle('app:openShell', async (_, path) => {
        await shell.openPath(path)
    })
}

function openItemHandler() {
    ipcMain.handle('app:openItem', async (_, path) => {
        await shell.openPath(path)
    })
}

function getResourceDownloadLinkForElementId() {
    ipcMain.handle('get-resource-download-link', async (_, elementId) => await getResourceLinkByElementID(elementId))
}

async function getBlobFromUrl() {
    ipcMain.handle('get-blob-from-element-id', async (_, elementId: string | number) => {
        const win = createScrapeWindow()
        const ssoLink = await getResourceLinkByElementID(elementId)
        await win.loadURL(ssoLink)
        const cookies = await getCookiesForDomain(win, ITSLEARNING_RESOURCE_URL)
        const cookiesFormatted = getFormattedCookies(cookies)
        const resourceLink = await getResourceDownloadLink(ssoLink, win)

        const { data } = await axios.get(resourceLink, {
            headers: {
                Cookie: cookiesFormatted,
            },
            responseType: 'arraybuffer'
        })

        return data
    })
}

async function getResourceAsFileHandler() {
    ipcMain.handle('resources:get-file', async (_, elementId: string | number) => {
        const win = createScrapeWindow()
        const ssoLink = await getResourceLinkByElementID(elementId)
        await win.loadURL(ssoLink)
        const cookies = await getCookiesForDomain(win, ITSLEARNING_RESOURCE_URL)
        const resourceLink = await getResourceDownloadLink(ssoLink, win)
        const resource = await getResourceAsFile(resourceLink, cookies)

        return resource
    })

}

async function getMicrosoftOfficeDocument() {
    ipcMain.handle('resources:get-office-document', async (_, elementId: string | number) => {
        try {
            const win = createScrapeWindow()
            const ssoLink = await getResourceLinkByElementID(elementId)
            await win.loadURL(ssoLink)
            const { downloadUrl, accessToken } = await getMicrosoftOfficeDocumentAccessTokenAndUrl(ssoLink)
            return { downloadUrl, accessToken }
        } catch (error) {
            console.error(error)
        }
    })
}

function uploadDocumentForAI() {
    ipcMain.handle('uploadfile-for-ai', async (event, { url, elementId }: {
        url: string,
        elementId: string | number
    }) => {
        console.log('uploadfile-for-ai')

        // make a get request to localhost:3000/api/checkFile/[elementId] to check if the current file exists
        // if it does then return
        // else continue

        const baseUrl = VITE_DEV_SERVER_URL ? 'http://localhost:3000' : 'https://itsdu.danielz.dev'

        const res = await fetch(`${baseUrl}/api/checkFile/${elementId}`)
        if (res.status === 200) throw new Error('File already exists for AI')
        if (res.status !== 404) throw new Error('Could not check if file exists for AI')
        const win = BrowserWindow.fromWebContents(event.sender)

        if (!win) return

        console.log('Getting cookies for AI')

        const cookies = await getCookiesForDomain(win, ITSLEARNING_RESOURCE_URL)

        const cookiesFormatted = getFormattedCookies(cookies)

        //send cookies to the server so that the server can download the file with the cookies
        const uploadRes = await axios.post(`${baseUrl}/api/uploadFile/${elementId}`, {
            cookies: cookiesFormatted,
            url
        })

        return uploadRes.status === 200
    })
}

function itslearningElementDownload() {
    ipcMain.handle("itslearning-element:download", async (event, { url, resourceLink, filename }) => {
        try {

            const win = BrowserWindow.fromWebContents(event.sender)

            if (!win) return
            console.log('download# ' + url)

            // download the file
            const downloadItem = await download(win, url, {
                // directory: app.getPath('downloads'),
                showProgressBar: true,
                showBadge: true,
                onProgress(progress) {
                    if (progress.totalBytes) {
                        const percent = Math.floor(
                            (progress.transferredBytes / progress.totalBytes) * 100
                        );
                        console.log(`Downloaded ${percent}%`);
                    }
                },
            })
            // logEverywhere('download# ' + downloadItem.getSavePath())
            event.sender.send("download:complete", downloadItem.getSavePath())
        } catch (e) {
            console.error(e)
            event.sender.send("download:error", null)
        }
    })
}

function downloadExternalHandler() {
    ipcMain.handle("download:external", async (event, { url, filename }) => {
        try {
            console.log(url, filename)

            const win = BrowserWindow.fromWebContents(event.sender)

            if (!win) return

            // download the file
            const downloadItem = await download(win, url, {
                // directory: app.getPath('downloads'),
                showProgressBar: true,
                showBadge: true,
            })
            event.sender.send("download:complete", downloadItem.getSavePath())
        } catch (e) {
            console.error(e)
            event.sender.send("download:error", null)
        }
    })
}


function downloadStartHandler() {
    ipcMain.handle("download:start", async (_, url) => {
        try {
            const fileLink = await getResourceDownloadLink(url)
            return fileLink
        } catch (e) {
            console.error(e)
            return null
        }
    })
}

function getVideoLinkHandler() {
    ipcMain.handle("resources:get-media", async (_, elementId: string | number) => {
        try {
            const win = createScrapeWindow()
            const ssoLink = await getResourceLinkByElementID(elementId)
            await win.loadURL(ssoLink)
            const iframeSrc = await win.webContents.executeJavaScript(`document.querySelectorAll('iframe')[1].src`)
            await win.loadURL(iframeSrc)
            const videoIframeSrc = await win.webContents.executeJavaScript(`document.querySelector('iframe').src`)
            await win.loadURL(videoIframeSrc)
            const mediaLink = await win.webContents.executeJavaScript(`document.querySelector('body').querySelector('[src]').src`)
            win.close()
            return mediaLink
        } catch (e) {
            console.error(e)
            return null
        }
    })
}

function getPayloadUrl(courseId: string | number) {
    const payloadUrl = new URL(`https://sdu.itslearning.com/Planner/Planner.aspx`);
    payloadUrl.searchParams.append('CourseID', courseId.toString());
    payloadUrl.searchParams.append('Filter', '-1');
    return payloadUrl.toString();
}


async function getCoursePlansInformation(body: string) {
    const cheerio = await import('cheerio')

    // Assuming your HTML snippet is stored in a variable named 'htmlContent'
    const $ = cheerio.load(body)

    // Select all elements with class 'itsl-topic'
    const courses = $('.itsl-topic')

    type CoursePlan = {
        dataTopicId: number | string;
        planTitle: string;
        plansCount: number;
        fromDate: string | null;
        toDate: string | null;
        attributes: {
            id: string
            class: string
            "data-topic-id": string
        }
    }

    const coursePlans: CoursePlan[] = []

    // Loop through each course to extract information
    courses.each((_, element) => {
        const attributes = element.attribs; // Get all attributes as an object

        // Extract specific attributes
        const dataTopicId = attributes['data-topic-id'];
        const planTitle = $(element).find('.itsl-topic-title span').text().trim();

        // Extract plans count
        const plansText = $(element).find('.itsl-topic-expander .itsl-topic-expanded-text').text().trim();
        const plansCount = parseInt(plansText.split(' ')[0]); // Extracting the numeric part

        // Extract and convert dates
        const datesText = $(element).find('.itsl-topic-expander .itsl-topic-dates').text().trim();
        // get the dates from the string "from 24-10-2023 to 31-10-2023"
        const dates = datesText.split(' ').slice(1, 4);
        let fromDate = null;
        let toDate = null;
        const fromDateString = dates[0]
        const toDateString = dates[2]

        import('moment').then(momentImport => {
            const moment = momentImport.default
            fromDate = fromDateString && moment(fromDateString, 'DD-MM-YYYY').toDate()

            toDate = toDateString && moment(toDateString, 'DD-MM-YYYY').toDate()
        })

        const coursePlan = {
            dataTopicId,
            planTitle,
            plansCount,
            fromDate,
            toDate,
            attributes
        } as CoursePlan

        coursePlans.push(coursePlan)
    });

    return coursePlans;
}

async function getCoursePlans(url: string) {
    const win = createScrapeWindow()
    await win.loadURL(url);
    const body = await win.webContents.executeJavaScript(`document.querySelector('body').innerHTML`)
    win.close()
    const coursePlans = await getCoursePlansInformation(body)
    return coursePlans;
}

function getCoursePlansHandler() {
    ipcMain.handle("resources:get-course-plans", async (_, courseId: string | number) => {
        try {
            const payloadUrl = getPayloadUrl(courseId)
            const ssoLink = await getSSOLink(payloadUrl)
            const coursePlans = await getCoursePlans(ssoLink)
            return coursePlans
        } catch (e) {
            console.error(e)
            return null
        }
    })
}

async function getCoursePlansElements(html: string) {
    const cheerio = await import('cheerio')

    const $ = cheerio.load(html)

    // Select all the gridrows that contain the information
    const gridRows = $('.gridrow')

    type ResponseObject = {
        title: string
        date: {
            from: Date | null
            to: Date | null
        }
        description: string | null
        resourcesAndActivities: ResourceActivityObject[]
    }

    type ResourceActivityObject = {
        planId: string | undefined
        elementId: string | undefined
        link: string | undefined
        title: string | undefined
        parentFolder: string | undefined
        img: string | undefined
    }

    const jsonObject: ResponseObject[] = []

    // Iterate through each gridrow to extract relevant information
    gridRows.each((_, element) => {
        const row = $(element)

        // Extract necessary information from each gridrow
        const title = row.find('.itsl-planner-min-title-width .itsl-plan-title-label').text().trim()
        const dateString = row.find('.itsl-plan-date .itsl-inline-date-picker-view').text().trim()
        const date = parseDateAndTime(dateString)
        let fromDate
        let toDate

        fromDate = date.from && date.from.toDate()
        toDate = date.to && date.to.toDate()

        const descriptionContainer = row.find('.itsl-planner-htmltext-viewer')
        const descriptionText = descriptionContainer.text().trim()
        const description = descriptionText !== "-" ? descriptionText : null
        const resourceActivityElements = row.find('.itsl-plan-elements-item')

        const resourcesAndActivities: ResourceActivityObject[] = []

        // Iterate through each element to extract IDs and links
        resourceActivityElements.each((_, element) => {
            const resourceActivity = $(element)

            // Extract the data attributes
            const planId = resourceActivity.attr('data-plan-id')
            const elementId = resourceActivity.attr('data-element-id')
            const link = resourceActivity.find('a.itsl-plan-elements-item-link').attr('href')
            const title = resourceActivity.find('span').text()
            const parentFolder = resourceActivity.attr('data-parent-folder-id')
            const img = resourceActivity.find('img').attr('src')

            // Create a JSON object for each resource and activity
            const resourceActivityObject = {
                planId,
                elementId,
                link,
                title,
                parentFolder,
                img,
            }

            // Add the JSON object to the array
            resourcesAndActivities.push(resourceActivityObject)
        })

        // Create a JSON object for each row
        const rowObject = {
            title,
            date: {
                from: fromDate,
                to: toDate
            },
            description,
            resourcesAndActivities,
        }

        // Add the JSON object to the array
        jsonObject.push(rowObject)
    })

    // Output the final JSON object
    return jsonObject
}


function getCoursePlanElementsHandler() {
    ipcMain.handle("resources:get-course-plan-elements", async (_, courseId: string | number, topicId: string | number) => {
        try {
            const win = createScrapeWindow()
            const payloadUrl = getPayloadUrl(courseId)
            const ssoLink = await getSSOLink(payloadUrl)
            await win.loadURL(ssoLink)
            const cookies = await getCookiesForDomain(win, ITSLEARNING_URL)
            win.close()
            const { data } = await axios.post('https://sdu.itslearning.com/RestApi/planner/plan/multiple/forTopic', {
                isSearching: false,
                searchText: null,
                pageNumber: 1,
                pageSize: 25,
                sort: 'Order:asc',
                filter: '',
                chunkNumber: 0,
                chunkSize: 15,
                courseId: courseId,
                topicId: topicId,
                start: '',
                end: '',
                childId: '0',
                dashboardHierarchyId: '0',
                dashboardName: '',
                currentDisplayMode: '0',
            }, {
                headers: {
                    Cookie: getFormattedCookies(cookies),
                },
            })

            const { gridData } = data

            const coursePlanElements = await getCoursePlansElements(gridData)

            return coursePlanElements
        } catch (e) {
            console.error(e)
            return null
        }
    })
}

function parseDateAndTime(dateString: string) {
    const dateRegex = /(\d{1,2}\. [a-zA-Z]+) (\d{1,2}:\d{2}) – (\d{1,2}\. [a-zA-Z]+) (\d{1,2}:\d{2})/;
    const timeRegex = /(\d{1,2}:\d{2}) – (\d{1,2}:\d{2})/;

    let fromDate, toDate;

    const dateMatch = dateString.match(dateRegex);
    const timeMatch = dateString.match(timeRegex);

    const moment = require('moment')

    if (dateMatch) {
        fromDate = moment(dateMatch[1], 'DD. MMM HH:mm');
        toDate = moment(dateMatch[3], 'DD. MMM HH:mm');
        if (!toDate.isValid()) {
            toDate = moment(dateMatch[3], 'DD. MMM HH:mm').add(1, 'day');
        }
    } else if (timeMatch) {
        const currentTime = moment().format('DD. MMM');
        fromDate = moment(`${currentTime} ${timeMatch[1]}`, 'DD. MMM HH:mm');
        toDate = moment(`${currentTime} ${timeMatch[2]}`, 'DD. MMM HH:mm');
        if (!toDate.isValid() || toDate.isBefore(fromDate)) {
            toDate = moment(`${currentTime} ${timeMatch[2]}`, 'DD. MMM HH:mm').add(1, 'day');
        }
    } else {
        fromDate = null;
        toDate = null;
    }

    return { from: fromDate, to: toDate };
}

function streamFileHandler() {
    ipcMain.handle("resources:stream-start", async (event, elementId) => {
        try {
            const win = createScrapeWindow()
            const ssoLink = await getResourceLinkByElementID(elementId)
            await win.loadURL(ssoLink)
            const cookies = await getCookiesForDomain(win, ITSLEARNING_RESOURCE_URL)
            const resourceLink = await getResourceDownloadLink(ssoLink, win)
            let downloaded = 0

            axios.get(resourceLink, {
                headers: {
                    Cookie: getFormattedCookies(cookies),
                },
                responseType: 'stream'
            }).then(res => {
                res.data.on('data', (data: ArrayBuffer) => {
                    downloaded += Buffer.byteLength(data)
                    console.log(downloaded)
                    event.sender.send('resources:stream-data', { total: res.headers['content-length'], loaded: downloaded })
                })
                res.data.on('end', () => {
                    // event.sender.send('downloadEnd')
                    // win.close()
                })
                res.data.on('error', (error: Error) => {
                    // event.sender.send('downloadError', error)
                })
            })

            return resourceLink
        } catch (e) {
            console.error(e)
            return null
        }
    })

}

export default function initDownloadHandlers() {
    getCoursePlanElementsHandler()
    getCoursePlansHandler()
    streamFileHandler()
    getVideoLinkHandler()
    openExternalHandler()
    getPathHandler()
    openShellHandler()
    openItemHandler()
    getResourceDownloadLinkForElementId()
    itslearningElementDownload()
    downloadExternalHandler()
    downloadStartHandler()
    uploadDocumentForAI()
    getBlobFromUrl()
    getMicrosoftOfficeDocument()
    getResourceAsFileHandler()
}