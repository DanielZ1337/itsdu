import {type ClassValue, clsx} from "clsx"
import {twMerge} from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

export const getQueryKeysFromParamsObject = (params: {
    [key: string]: string | number | Date | undefined | boolean | number[]
}) => {
    // eslint-disable-next-line no-unused-vars
    params = Object.fromEntries(Object.entries(params).filter(([_, value]) => value !== undefined))

    if (Object.keys(params).length === 0) return []

    // turn all date objects into queryKeys with the date in ISO format with only Days, Months and Years

    return Object.keys(params).map((key) => {
        if (params[key] instanceof Date) {
            return (params[key] as Date).toISOString().split("T")[0]
        } else if (typeof params[key] === "boolean") {
            return params[key] ? "true" : "false"
        } else if (Array.isArray(params[key])) {
            return (params[key]! as []).join(",")
        } else {
            return params[key]!.toString()
        }
    })
}

export const baseUrl = import.meta.env.DEV ? 'http://localhost:8080/' : 'https://sdu.itslearning.com/'

export const apiUrl = (route: string, options?: {
    [key: string]: string | number | Date | undefined | boolean | number[]
}) => {

    // replace all path parameters with the values from the options object
    route.match(/{(.*?)}/g)?.forEach((match) => {
        const key = match.replace("{", "").replace("}", "")
        if (options?.[key] !== undefined) {
            route = route.replace(match, options[key]!.toString())
            // delete options[key]
        }
    })

    // remove everything after the first ? in the route
    route = route.split("?")[0]

    const url = new URL(route, baseUrl)

    // add all remaining options as query parameters
    for (const [key, value] of Object.entries(options ?? {})) {
        if (value !== undefined) {
            if (value instanceof Date) {
                url.searchParams.append(key, value.toISOString())
            } else if (typeof value === "boolean") {
                url.searchParams.append(key, value ? "true" : "false")
            } else if (Array.isArray(value)) {
                url.searchParams.append(key, value.join(","))
            } else {
                url.searchParams.append(key, value.toString())
            }
        }
    }

    return url.toString()
}

export function getRelativeTimeString(
    date: Date | number,
    lang = navigator.language
): string {
    // Allow dates or times to be passed
    const timeMs = typeof date === "number" ? date : date.getTime();

    // Get the amount of seconds between the given date and now
    const deltaSeconds = Math.round((timeMs - Date.now()) / 1000);

    // Array reprsenting one minute, hour, day, week, month, etc in seconds
    const cutoffs = [60, 3600, 86400, 86400 * 7, 86400 * 30, 86400 * 365, Infinity];

    // Array equivalent to the above but in the string representation of the units
    const units: Intl.RelativeTimeFormatUnit[] = ["second", "minute", "hour", "day", "week", "month", "year"];

    // Grab the ideal cutoff unit
    const unitIndex = cutoffs.findIndex(cutoff => cutoff > Math.abs(deltaSeconds));

    // Get the divisor to divide from the seconds. E.g. if our unit is "day" our divisor
    // is one day in seconds, so we can divide our seconds by this to get the # of days
    const divisor = unitIndex ? cutoffs[unitIndex - 1] : 1;

    // Intl.RelativeTimeFormat do its magic
    const rtf = new Intl.RelativeTimeFormat(lang, {numeric: "auto"});
    return rtf.format(Math.floor(deltaSeconds / divisor), units[unitIndex]);
}

export function isMacOS() {
    return navigator.platform.toUpperCase().indexOf('MAC') >= 0;
}