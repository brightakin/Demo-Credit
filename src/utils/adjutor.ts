import axios from "axios";
import logger from "./logger";

interface KarmaPayload {
  karma_identity: string;
  amount_in_contention: string;
  reason: string | null;
  default_date: string;
  karma_type: {
    karma: string;
  };
  karma_identity_type: {
    identity_type: string;
  };
  reporting_entity: {
    name: string;
    email: string;
  };
}

interface AdjutorResponse {
  status: string;
  message: string;
  data: KarmaPayload | null;
  meta?: {
    cost: number;
    balance: number;
  };
}

export const checkKarmaBlacklist = async (
  identity: string,
): Promise<boolean> => {
  try {
    const apiKey = process.env.ADJUTOR_API_KEY;
    const baseUrl = process.env.ADJUTOR_BASE_URL;

    const response = await axios.get<AdjutorResponse>(
      `${baseUrl}/verification/karma/${identity}`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        timeout: 10000,
      },
    );
    logger.info(
      `Adjutor response for "${identity}": ${JSON.stringify(response.status)} - ${JSON.stringify(response.data)}`,
    );
    const isBlacklisted =
      response.data?.data !== null && response.data?.data !== undefined;
    logger.info(
      `Adjutor karma check for "${identity}": blacklisted=${isBlacklisted}`,
    );

    return isBlacklisted;
  } catch (error: unknown) {
    logger.error(`Error checking karma blacklist for "${identity}":`, error);
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      // 404 means identity not found in karma blacklist — user is clean
      logger.info(
        `Adjutor karma check for "${identity}": blacklisted=false (not found in karma)`,
      );
      return false;
    }
    // Re-throw unexpected errors so the caller can handle them
    throw error;
  }
};
