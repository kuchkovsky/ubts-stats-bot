import dayjs from 'dayjs';

export const ROZBIYNYK_IMG_PATH = './img/rozbiynyk.jpg';

export const WHITESPACE_SEPARATED_NUMBERS_REGEX = /\d+\s\d+/;
export const WHITESPACE_REGEX = /\s/;
export const NUMBER_REGEX = /\d+/;

export const DATE_FORMAT = 'YYYY-MM-DD';

export const getPreviousSunday = () => dayjs().subtract(1, 'day').day(0)
  .format(DATE_FORMAT);
