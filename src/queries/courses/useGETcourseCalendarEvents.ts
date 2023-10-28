import {useQuery, UseQueryOptions} from "@tanstack/react-query";
import axios from "axios";
import {getQueryKeysFromParamsObject} from "@/lib/utils.ts";
import {
    GETcourseCalenderEvents,
    GETcourseCalenderEventsApiUrl,
    GETcourseCalenderEventsParams
} from "@/types/api-types/courses/GETcourseCalenderEvents.ts";
import {TanstackKeys} from "@/types/tanstack-keys";

export default function useGETcourseCalendarEvents(params: GETcourseCalenderEventsParams, queryConfig?: UseQueryOptions<GETcourseCalenderEvents, Error, GETcourseCalenderEvents, string[]>) {

    return useQuery([TanstackKeys.CourseCalendarEvents, ...getQueryKeysFromParamsObject(params)], async () => {
        const res = await axios.get(GETcourseCalenderEventsApiUrl({
            ...params
        }), {
            params: {
                "access_token": localStorage.getItem('access_token') || '',
                ...params,
            }
        });

        if (res.status !== 200) throw new Error(res.statusText);

        return res.data;
    }, {
        ...queryConfig
    })
}