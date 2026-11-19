// Arabic is the source of truth: every other language must have the same keys.
const ar = {
  app: {
    name: "دوري",
    tagline: "اعرف دورك ووقت وصول طلبك",
  },
  lookup: {
    restaurant: "المطعم",
    invoiceNumber: "رقم الفاتورة",
    submit: "اعرف دوري",
  },
  language: {
    switchTo: "English",
  },
};

export type Messages = typeof ar;
export default ar;
