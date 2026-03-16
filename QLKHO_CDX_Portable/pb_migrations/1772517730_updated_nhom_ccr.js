/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_3916463089")

  // add field
  collection.fields.addAt(1, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text3028654702",
    "max": 0,
    "min": 0,
    "name": "id_ban_quan_ly",
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
    "id": "text1119684251",
    "max": 0,
    "min": 0,
    "name": "ma_nhom",
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
    "id": "text1347446100",
    "max": 0,
    "min": 0,
    "name": "ten_nhom",
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
    "id": "text3082544817",
    "max": 0,
    "min": 0,
    "name": "nguoi_dai_dien",
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
  collection.fields.addAt(6, new Field({
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
  collection.fields.addAt(7, new Field({
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
  collection.fields.addAt(8, new Field({
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
  collection.fields.addAt(9, new Field({
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
  collection.fields.addAt(10, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text1959103095",
    "max": 0,
    "min": 0,
    "name": "xom",
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
    "id": "text292177843",
    "max": 0,
    "min": 0,
    "name": "vi_tri",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(12, new Field({
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
  collection.fields.addAt(13, new Field({
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
  collection.fields.addAt(14, new Field({
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
  collection.fields.addAt(15, new Field({
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
  collection.fields.addAt(16, new Field({
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
  collection.fields.addAt(17, new Field({
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
  collection.fields.addAt(18, new Field({
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
  collection.fields.addAt(19, new Field({
    "hidden": false,
    "id": "number2200769775",
    "max": null,
    "min": null,
    "name": "so_thanh_vien",
    "onlyInt": false,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "number"
  }))

  // add field
  collection.fields.addAt(20, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text3845209183",
    "max": 0,
    "min": 0,
    "name": "ngay_cap_nhat",
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
    "id": "text1859521238",
    "max": 0,
    "min": 0,
    "name": "nguoi_cap_nhat",
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
  collection.fields.addAt(23, new Field({
    "hidden": false,
    "id": "number3948524380",
    "max": null,
    "min": null,
    "name": "dien_tich_khai_thac",
    "onlyInt": false,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "number"
  }))

  // add field
  collection.fields.addAt(24, new Field({
    "hidden": false,
    "id": "number3055792517",
    "max": null,
    "min": null,
    "name": "dien_tich_trong",
    "onlyInt": false,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "number"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_3916463089")

  // remove field
  collection.fields.removeById("text3028654702")

  // remove field
  collection.fields.removeById("text1119684251")

  // remove field
  collection.fields.removeById("text1347446100")

  // remove field
  collection.fields.removeById("text3082544817")

  // remove field
  collection.fields.removeById("text3600787975")

  // remove field
  collection.fields.removeById("text696902969")

  // remove field
  collection.fields.removeById("text973649723")

  // remove field
  collection.fields.removeById("text3659602781")

  // remove field
  collection.fields.removeById("text2626334927")

  // remove field
  collection.fields.removeById("text1959103095")

  // remove field
  collection.fields.removeById("text292177843")

  // remove field
  collection.fields.removeById("number688407896")

  // remove field
  collection.fields.removeById("number4021953871")

  // remove field
  collection.fields.removeById("number3704608107")

  // remove field
  collection.fields.removeById("number1459640278")

  // remove field
  collection.fields.removeById("number3398599610")

  // remove field
  collection.fields.removeById("number3298402226")

  // remove field
  collection.fields.removeById("number2561788050")

  // remove field
  collection.fields.removeById("number2200769775")

  // remove field
  collection.fields.removeById("text3845209183")

  // remove field
  collection.fields.removeById("text1859521238")

  // remove field
  collection.fields.removeById("text2040749991")

  // remove field
  collection.fields.removeById("number3948524380")

  // remove field
  collection.fields.removeById("number3055792517")

  return app.save(collection)
})
