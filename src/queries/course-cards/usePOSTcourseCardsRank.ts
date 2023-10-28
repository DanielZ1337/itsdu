import {useMutation, UseMutationOptions} from "@tanstack/react-query";
import axios from "axios";
import {
    POSTcourseCardsRankApiUrl,
    POSTcourseCardsRankBody
} from "@/types/api-types/course-cards/POSTcourseCardsRank.ts";
import {TanstackKeys} from "@/types/tanstack-keys";

export default function usePOSTcourseCardsRank(queryConfig?: UseMutationOptions<any, Error, POSTcourseCardsRankBody, string[]>) {

    return useMutation([TanstackKeys.CourseCardsRank], async (body) => {
        const res = await axios.post(POSTcourseCardsRankApiUrl, body, {
            params: {
                "access_token": localStorage.getItem('access_token') || '',
            }
        });

        if (res.status !== 200) throw new Error(res.statusText);

        return res.data
    }, {
        ...queryConfig
    })
}