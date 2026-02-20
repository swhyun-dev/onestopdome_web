// src/types.ts

export interface Goods {
    goods_seq: number;
    provider_seq: number | null;
    goods_code: string | null;
    goods_name: string;
    goods_status: "normal" | "runout" | "purchasing" | "unsold";
    goods_view: "look" | "notLook";
    default_consumer_price: number;
    default_price: number;
    default_discount: number;
    tot_stock: number;
    purchase_ea: number;
    purchase_ea_3mon: number;
    page_view: number;
    review_count: number;
    regist_date: string;
    update_date: string;
  }
  
  export interface Member {
    member_seq: number;
    userid: string | null;
    user_name: string | null;
    email: string | null;
    cellphone: string | null;
    status: "done" | "hold" | "withdrawal" | "dormancy";
    group_seq: number;
    emoney: number;
    point: number;
    member_order_cnt: number;
    member_order_price: number;
    regist_date: string;
    lastlogin_date: string;
  }
  
  export interface Order {
    order_seq: number;
    member_seq: number | null;
    step: string;
    settleprice: number;
    payment: string | null;
    shipping_cost: number;
    order_user_name: string;
    order_email: string;
    recipient_user_name: string | null;
    regist_date: string;
    sitetype: string;
    label: string | null;
  }
  