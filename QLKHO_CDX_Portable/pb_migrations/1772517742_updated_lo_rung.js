/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_3094090734")

  // add field
  collection.fields.addAt(1, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text3862934331",
    "max": 0,
    "min": 0,
    "name": "id_nhom",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(2, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text2311856688",
    "max": 0,
    "min": 0,
    "name": "id_chu_rung",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(3, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text3102463961",
    "max": 0,
    "min": 0,
    "name": "ma_so_lo_rung",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(4, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text1346886613",
    "max": 0,
    "min": 0,
    "name": "ma_so_lo",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(5, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text2106269621",
    "max": 0,
    "min": 0,
    "name": "qr_code",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(6, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text3192280975",
    "max": 0,
    "min": 0,
    "name": "ten_lo_rung",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(7, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text2710571417",
    "max": 0,
    "min": 0,
    "name": "so_so_do",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(8, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text385574469",
    "max": 0,
    "min": 0,
    "name": "to_ban_do",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(9, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text4259451845",
    "max": 0,
    "min": 0,
    "name": "thua_dat",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(10, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text1622861642",
    "max": 0,
    "min": 0,
    "name": "tieu_khu",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(11, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text3908340663",
    "max": 0,
    "min": 0,
    "name": "khoanh",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(12, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text2775302958",
    "max": 0,
    "min": 0,
    "name": "toa_do_tam_lo",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(13, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text233493316",
    "max": 0,
    "min": 0,
    "name": "khoang_cach_toi_nha",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(14, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text271780582",
    "max": 0,
    "min": 0,
    "name": "dia_chi_lo",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(15, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text1766174206",
    "max": 0,
    "min": 0,
    "name": "tinh_trang_so_do",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(16, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text3068263945",
    "max": 0,
    "min": 0,
    "name": "ngay_tham_gia_fsc",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(17, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text589750777",
    "max": 0,
    "min": 0,
    "name": "tinh_trang_xoi_mon",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(18, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text2380369274",
    "max": 0,
    "min": 0,
    "name": "nguyen_nhan_xoi_mon",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(19, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text3988855365",
    "max": 0,
    "min": 0,
    "name": "moc_ranh_gioi",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(20, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text383779432",
    "max": 0,
    "min": 0,
    "name": "do_ben_vung_moc_ranh",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(21, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text1075214571",
    "max": 0,
    "min": 0,
    "name": "trang_thai",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(22, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text474912465",
    "max": 0,
    "min": 0,
    "name": "do_doc_binh_quan",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(23, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text2697705965",
    "max": 0,
    "min": 0,
    "name": "giap_ranh_rung_tu_nhien",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(24, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text1574005663",
    "max": 0,
    "min": 0,
    "name": "co_loai_cay_ban_dia",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(25, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text279712322",
    "max": 0,
    "min": 0,
    "name": "ten_dong_vat_thuc_vat_quy",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(26, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text548824989",
    "max": 0,
    "min": 0,
    "name": "loai_cay_trong_chinh",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(27, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text2506002539",
    "max": 0,
    "min": 0,
    "name": "loai_cay_trong_xen_ghep",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(28, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text515851143",
    "max": 0,
    "min": 0,
    "name": "loai_cay_trong_fsc",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(29, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text1451145398",
    "max": 0,
    "min": 0,
    "name": "nguon_goc_giong",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(30, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text892283181",
    "max": 0,
    "min": 0,
    "name": "mo_ta_nguon_goc_giong",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(31, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text1684154236",
    "max": 0,
    "min": 0,
    "name": "co_hoa_don_giong",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(32, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text1536816720",
    "max": 0,
    "min": 0,
    "name": "mat_do_ban_dau",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(33, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text427211572",
    "max": 0,
    "min": 0,
    "name": "mat_do_sau_tia_thua",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(34, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text270168778",
    "max": 0,
    "min": 0,
    "name": "so_cay_trong_chinh",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(35, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text83842219",
    "max": 0,
    "min": 0,
    "name": "so_cay_trong_dam",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(36, new Field({
    "hidden": false,
    "id": "number3398599610",
    "max": null,
    "min": null,
    "name": "tong_dien_tich",
    "onlyInt": false,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "number"
  }))

  // add field
  collection.fields.addAt(37, new Field({
    "hidden": false,
    "id": "number1259198669",
    "max": null,
    "min": null,
    "name": "dien_tich_gcn_qsdd",
    "onlyInt": false,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "number"
  }))

  // add field
  collection.fields.addAt(38, new Field({
    "hidden": false,
    "id": "number2476292323",
    "max": null,
    "min": null,
    "name": "dien_tich_trong_rung",
    "onlyInt": false,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "number"
  }))

  // add field
  collection.fields.addAt(39, new Field({
    "hidden": false,
    "id": "number688407896",
    "max": null,
    "min": null,
    "name": "dien_tich_fsc",
    "onlyInt": false,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "number"
  }))

  // add field
  collection.fields.addAt(40, new Field({
    "hidden": false,
    "id": "number4021953871",
    "max": null,
    "min": null,
    "name": "dien_tich_ngoai_fsc",
    "onlyInt": false,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "number"
  }))

  // add field
  collection.fields.addAt(41, new Field({
    "hidden": false,
    "id": "number1459640278",
    "max": null,
    "min": null,
    "name": "dien_tich_vung_dem",
    "onlyInt": false,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "number"
  }))

  // add field
  collection.fields.addAt(42, new Field({
    "hidden": false,
    "id": "number3704608107",
    "max": null,
    "min": null,
    "name": "dien_tich_rung_tu_nhien",
    "onlyInt": false,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "number"
  }))

  // add field
  collection.fields.addAt(43, new Field({
    "hidden": false,
    "id": "number3196546018",
    "max": null,
    "min": null,
    "name": "dien_tich_hlvs",
    "onlyInt": false,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "number"
  }))

  // add field
  collection.fields.addAt(44, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text1807659868",
    "max": 0,
    "min": 0,
    "name": "co_ao_ho",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(45, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text2456872925",
    "max": 0,
    "min": 0,
    "name": "thoi_diem_trong",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(46, new Field({
    "hidden": false,
    "id": "number3742853485",
    "max": null,
    "min": null,
    "name": "nam_trong",
    "onlyInt": false,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "number"
  }))

  // add field
  collection.fields.addAt(47, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text2248435489",
    "max": 0,
    "min": 0,
    "name": "so_nam_khai_thac",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(48, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text4098659336",
    "max": 0,
    "min": 0,
    "name": "nam_khai_thac",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(49, new Field({
    "hidden": false,
    "id": "number606233596",
    "max": null,
    "min": null,
    "name": "san_luong_khai_thac_xe",
    "onlyInt": false,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "number"
  }))

  // add field
  collection.fields.addAt(50, new Field({
    "hidden": false,
    "id": "number612299052",
    "max": null,
    "min": null,
    "name": "san_luong_khai_thac_dam",
    "onlyInt": false,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "number"
  }))

  // add field
  collection.fields.addAt(51, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text3965415768",
    "max": 0,
    "min": 0,
    "name": "co_thue_lao_dong",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(52, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text46492371",
    "max": 0,
    "min": 0,
    "name": "phuong_tien_bao_ho",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(53, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text3945231425",
    "max": 0,
    "min": 0,
    "name": "loai_phuong_tien_bhld",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(54, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text1967381156",
    "max": 0,
    "min": 0,
    "name": "ky_thuat_truoc_trong",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(55, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text3094695259",
    "max": 0,
    "min": 0,
    "name": "ky_thuat_cham_soc",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(56, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text2849704203",
    "max": 0,
    "min": 0,
    "name": "cuoc_ho_bang_may",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(57, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text4189609518",
    "max": 0,
    "min": 0,
    "name": "bon_phan",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(58, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text2974385143",
    "max": 0,
    "min": 0,
    "name": "loai_phan_bon",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(59, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text1125164997",
    "max": 0,
    "min": 0,
    "name": "dinh_luong_phan_bon",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(60, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text784433018",
    "max": 0,
    "min": 0,
    "name": "kiem_soat_dich_benh",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(61, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text1468495374",
    "max": 0,
    "min": 0,
    "name": "tinh_hinh_sau_benh",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(62, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text4025270722",
    "max": 0,
    "min": 0,
    "name": "thuoc_su_dung",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(63, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text3726559465",
    "max": 0,
    "min": 0,
    "name": "phong_chay_chua_chay",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(64, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text3334558960",
    "max": 0,
    "min": 0,
    "name": "thoi_gian_khai_thac",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(65, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text318804731",
    "max": 0,
    "min": 0,
    "name": "dia_danh",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(66, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text404503710",
    "max": 0,
    "min": 0,
    "name": "so_hieu_lo",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(67, new Field({
    "hidden": false,
    "id": "number1489646804",
    "max": null,
    "min": null,
    "name": "kinh_do",
    "onlyInt": false,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "number"
  }))

  // add field
  collection.fields.addAt(68, new Field({
    "hidden": false,
    "id": "number1306714396",
    "max": null,
    "min": null,
    "name": "vi_do",
    "onlyInt": false,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "number"
  }))

  // add field
  collection.fields.addAt(69, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text122125654",
    "max": 0,
    "min": 0,
    "name": "ten_tinh",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(70, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text3911141746",
    "max": 0,
    "min": 0,
    "name": "ten_huyen",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(71, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text300506564",
    "max": 0,
    "min": 0,
    "name": "ten_xa",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(72, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text1550424810",
    "max": 0,
    "min": 0,
    "name": "ten_xa_moi",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_3094090734")

  // remove field
  collection.fields.removeById("text3862934331")

  // remove field
  collection.fields.removeById("text2311856688")

  // remove field
  collection.fields.removeById("text3102463961")

  // remove field
  collection.fields.removeById("text1346886613")

  // remove field
  collection.fields.removeById("text2106269621")

  // remove field
  collection.fields.removeById("text3192280975")

  // remove field
  collection.fields.removeById("text2710571417")

  // remove field
  collection.fields.removeById("text385574469")

  // remove field
  collection.fields.removeById("text4259451845")

  // remove field
  collection.fields.removeById("text1622861642")

  // remove field
  collection.fields.removeById("text3908340663")

  // remove field
  collection.fields.removeById("text2775302958")

  // remove field
  collection.fields.removeById("text233493316")

  // remove field
  collection.fields.removeById("text271780582")

  // remove field
  collection.fields.removeById("text1766174206")

  // remove field
  collection.fields.removeById("text3068263945")

  // remove field
  collection.fields.removeById("text589750777")

  // remove field
  collection.fields.removeById("text2380369274")

  // remove field
  collection.fields.removeById("text3988855365")

  // remove field
  collection.fields.removeById("text383779432")

  // remove field
  collection.fields.removeById("text1075214571")

  // remove field
  collection.fields.removeById("text474912465")

  // remove field
  collection.fields.removeById("text2697705965")

  // remove field
  collection.fields.removeById("text1574005663")

  // remove field
  collection.fields.removeById("text279712322")

  // remove field
  collection.fields.removeById("text548824989")

  // remove field
  collection.fields.removeById("text2506002539")

  // remove field
  collection.fields.removeById("text515851143")

  // remove field
  collection.fields.removeById("text1451145398")

  // remove field
  collection.fields.removeById("text892283181")

  // remove field
  collection.fields.removeById("text1684154236")

  // remove field
  collection.fields.removeById("text1536816720")

  // remove field
  collection.fields.removeById("text427211572")

  // remove field
  collection.fields.removeById("text270168778")

  // remove field
  collection.fields.removeById("text83842219")

  // remove field
  collection.fields.removeById("number3398599610")

  // remove field
  collection.fields.removeById("number1259198669")

  // remove field
  collection.fields.removeById("number2476292323")

  // remove field
  collection.fields.removeById("number688407896")

  // remove field
  collection.fields.removeById("number4021953871")

  // remove field
  collection.fields.removeById("number1459640278")

  // remove field
  collection.fields.removeById("number3704608107")

  // remove field
  collection.fields.removeById("number3196546018")

  // remove field
  collection.fields.removeById("text1807659868")

  // remove field
  collection.fields.removeById("text2456872925")

  // remove field
  collection.fields.removeById("number3742853485")

  // remove field
  collection.fields.removeById("text2248435489")

  // remove field
  collection.fields.removeById("text4098659336")

  // remove field
  collection.fields.removeById("number606233596")

  // remove field
  collection.fields.removeById("number612299052")

  // remove field
  collection.fields.removeById("text3965415768")

  // remove field
  collection.fields.removeById("text46492371")

  // remove field
  collection.fields.removeById("text3945231425")

  // remove field
  collection.fields.removeById("text1967381156")

  // remove field
  collection.fields.removeById("text3094695259")

  // remove field
  collection.fields.removeById("text2849704203")

  // remove field
  collection.fields.removeById("text4189609518")

  // remove field
  collection.fields.removeById("text2974385143")

  // remove field
  collection.fields.removeById("text1125164997")

  // remove field
  collection.fields.removeById("text784433018")

  // remove field
  collection.fields.removeById("text1468495374")

  // remove field
  collection.fields.removeById("text4025270722")

  // remove field
  collection.fields.removeById("text3726559465")

  // remove field
  collection.fields.removeById("text3334558960")

  // remove field
  collection.fields.removeById("text318804731")

  // remove field
  collection.fields.removeById("text404503710")

  // remove field
  collection.fields.removeById("number1489646804")

  // remove field
  collection.fields.removeById("number1306714396")

  // remove field
  collection.fields.removeById("text122125654")

  // remove field
  collection.fields.removeById("text3911141746")

  // remove field
  collection.fields.removeById("text300506564")

  // remove field
  collection.fields.removeById("text1550424810")

  return app.save(collection)
})
