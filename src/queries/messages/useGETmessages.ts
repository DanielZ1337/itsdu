import {useQuery, UseQueryOptions} from "@tanstack/react-query";
import axios from "axios";
import {GETmessages, GETmessagesApiUrl, GETmessagesParams} from "@/api-types/messages/GETmessages.ts";
import {getQueryKeysFromParamsObject} from "@/lib/utils.ts";

export default function useGETmessages(params: GETmessagesParams, queryConfig?: UseQueryOptions<GETmessages, Error, GETmessages, string[]>) {

    return useQuery(['messages', ...getQueryKeysFromParamsObject(params)], async () => {
        console.log('useGETmessages')
        const res = await axios.get(GETmessagesApiUrl(params), {
            params: {
                "access_token": localStorage.getItem('access_token') || '',
            }
        });

        if (res.status !== 200) throw new Error(res.statusText);

        return res.data;
    }, {
        ...queryConfig
    })
}