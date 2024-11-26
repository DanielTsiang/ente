import log from "@/base/log";
import { apiURL } from "@/base/origins";
import { ApiError } from "../error";
import { getToken } from "../storage/localStorage/helpers";
import HTTPService from "./HTTPService";

class CastGateway {
    public async revokeAllTokens() {
        try {
            const token = getToken();
            await HTTPService.delete(
                await apiURL("/cast/revoke-all-tokens"),
                undefined,
                undefined,
                {
                    "X-Auth-Token": token,
                },
            );
        } catch (e) {
            log.error("removeAllTokens failed", e);
            // swallow error
        }
    }

    public async getPublicKey(code: string): Promise<string> {
        let resp;
        try {
            const token = getToken();
            resp = await HTTPService.get(
                await apiURL(`/cast/device-info/${code}`),
                undefined,
                {
                    "X-Auth-Token": token,
                },
            );
        } catch (e) {
            if (e instanceof ApiError && e.httpStatusCode === 404) {
                return "";
            }
            log.error("failed to getPublicKey", e);
            throw e;
        }
        return resp.data.publicKey;
    }

    public async publishCastPayload(
        code: string,
        castPayload: string,
        collectionID: number,
        castToken: string,
    ) {
        const token = getToken();
        await HTTPService.post(
            await apiURL("/cast/cast-data"),
            {
                // eslint-disable-next-line @typescript-eslint/no-unnecessary-template-expression
                deviceCode: `${code}`,
                encPayload: castPayload,
                collectionID: collectionID,
                castToken: castToken,
            },
            undefined,
            { "X-Auth-Token": token },
        );
    }
}

export default new CastGateway();
