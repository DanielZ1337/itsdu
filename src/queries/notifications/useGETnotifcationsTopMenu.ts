import {useQuery, UseQueryOptions} from "@tanstack/react-query";
import axios from "axios";
import {getQueryKeysFromParamsObject} from "@/lib/utils.ts";
import {
    GETnotificationsTopMenu,
    GETnotificationsTopMenuApiParams,
    GETnotificationsTopMenuApiUrl
} from '@/types/api-types/notifications/GETnotifcationsTopMenu';
import {TanstackKeys} from "@/types/tanstack-keys";

export default function useGETnotificationsTopMenu(params: GETnotificationsTopMenuApiParams, queryConfig?: UseQueryOptions<GETnotificationsTopMenuApiParams, Error, GETnotificationsTopMenu, string[]>) {

    return useQuery([TanstackKeys.NotificationsTopMenu, ...getQueryKeysFromParamsObject(params)], async () => {
        const res = await axios.get(GETnotificationsTopMenuApiUrl(params), {
            params: {
                "access_token": localStorage.getItem('access_token') || '',
            },
        });

        if (res.status !== 200) throw new Error(res.statusText);

        return res.data;
    }, {
        ...queryConfig
    })
}