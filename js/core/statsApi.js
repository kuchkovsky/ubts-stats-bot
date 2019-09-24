const API_URL = process.env.UBTS_STATS_API_URL;

export const LDAP_USERS = `${API_URL}/users?ldap=true`;
export const ALL_RECORDS = `${API_URL}/records/all`;

export const derivePhoneUrl = phone => `${API_URL}/users?phone=${phone}`;

export const deriveMessengerIdsUrl = userId => `${API_URL}/users/${userId}/messenger_ids`;

export const deriveUserByTelegramIdUrl = chatId => `${API_URL}/users/telegram_id/${chatId}`;

export const deriveRecordsUrl = userId => `${API_URL}/records/${userId}`;
