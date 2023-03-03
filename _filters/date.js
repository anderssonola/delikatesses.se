const dayjs = require("dayjs");

dayjs
  .extend(require("dayjs/plugin/localizedFormat"))
  .extend(require("dayjs/plugin/relativeTime"));

require(`dayjs/locale/sv`)

module.exports = {
  dateFormat: function (date, format = "LLL") {
    return dayjs(date).format(format);
  },

  dateRelative: function (date) {
    return dayjs(date).fromNow();
  },

  dateISO: (date) => dayjs(date).toISOString(),
  dateRSS: (date) => dayjs(date).format("ddd, D MMM YYYY HH:mm:ss ZZ"),
};
