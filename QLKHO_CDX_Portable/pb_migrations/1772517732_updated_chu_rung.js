/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_2572785340")

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
    "id": "text1007796429",
    "max": 0,
    "min": 0,
    "name": "ho_ten",
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
    "id": "text3802468848",
    "max": 0,
    "min": 0,
    "name": "gioi_tinh",
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
    "id": "text2511533286",
    "max": 0,
    "min": 0,
    "name": "ngay_sinh",
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
    "id": "text4051122857",
    "max": 0,
    "min": 0,
    "name": "dan_toc",
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
    "id": "text1179217837",
    "max": 0,
    "min": 0,
    "name": "cccd",
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
    "id": "text83157173",
    "max": 0,
    "min": 0,
    "name": "ho_ten_vo",
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
    "id": "text2257469056",
    "max": 0,
    "min": 0,
    "name": "ho_ten_chong",
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
    "id": "text3600787975",
    "max": 0,
    "min": 0,
    "name": "so_dien_thoai",
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
    "id": "text973649723",
    "max": 0,
    "min": 0,
    "name": "tinh",
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
    "id": "text3659602781",
    "max": 0,
    "min": 0,
    "name": "huyen",
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
    "id": "text2626334927",
    "max": 0,
    "min": 0,
    "name": "xa",
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
    "id": "text3417459064",
    "max": 0,
    "min": 0,
    "name": "thon",
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
    "id": "text696902969",
    "max": 0,
    "min": 0,
    "name": "dia_chi",
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
    "id": "text4084452732",
    "max": 0,
    "min": 0,
    "name": "ngay_tham_gia",
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
    "id": "text3677266090",
    "max": 0,
    "min": 0,
    "name": "ngay_roi_nhom",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(17, new Field({
    "hidden": false,
    "id": "number1165707912",
    "max": null,
    "min": null,
    "name": "so_lo_rung",
    "onlyInt": false,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "number"
  }))

  // add field
  collection.fields.addAt(18, new Field({
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
  collection.fields.addAt(19, new Field({
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
  collection.fields.addAt(20, new Field({
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
  collection.fields.addAt(21, new Field({
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
  collection.fields.addAt(22, new Field({
    "hidden": false,
    "id": "number3298402226",
    "max": null,
    "min": null,
    "name": "san_luong_du_kien_nam",
    "onlyInt": false,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "number"
  }))

  // add field
  collection.fields.addAt(23, new Field({
    "hidden": false,
    "id": "number2561788050",
    "max": null,
    "min": null,
    "name": "dien_tich_trong_rung_nam",
    "onlyInt": false,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "number"
  }))

  // add field
  collection.fields.addAt(24, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text2844665050",
    "max": 0,
    "min": 0,
    "name": "nguoi_nhap",
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
    "id": "text2040749991",
    "max": 0,
    "min": 0,
    "name": "duong_dan_file",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(26, new Field({
    "hidden": false,
    "id": "bool3602537393",
    "name": "da_tap_huan",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "bool"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_2572785340")

  // remove field
  collection.fields.removeById("text3862934331")

  // remove field
  collection.fields.removeById("text1007796429")

  // remove field
  collection.fields.removeById("text3802468848")

  // remove field
  collection.fields.removeById("text2511533286")

  // remove field
  collection.fields.removeById("text4051122857")

  // remove field
  collection.fields.removeById("text1179217837")

  // remove field
  collection.fields.removeById("text83157173")

  // remove field
  collection.fields.removeById("text2257469056")

  // remove field
  collection.fields.removeById("text3600787975")

  // remove field
  collection.fields.removeById("text973649723")

  // remove field
  collection.fields.removeById("text3659602781")

  // remove field
  collection.fields.removeById("text2626334927")

  // remove field
  collection.fields.removeById("text3417459064")

  // remove field
  collection.fields.removeById("text696902969")

  // remove field
  collection.fields.removeById("text4084452732")

  // remove field
  collection.fields.removeById("text3677266090")

  // remove field
  collection.fields.removeById("number1165707912")

  // remove field
  collection.fields.removeById("number3398599610")

  // remove field
  collection.fields.removeById("number688407896")

  // remove field
  collection.fields.removeById("number3704608107")

  // remove field
  collection.fields.removeById("number1459640278")

  // remove field
  collection.fields.removeById("number3298402226")

  // remove field
  collection.fields.removeById("number2561788050")

  // remove field
  collection.fields.removeById("text2844665050")

  // remove field
  collection.fields.removeById("text2040749991")

  // remove field
  collection.fields.removeById("bool3602537393")

  return app.save(collection)
})
