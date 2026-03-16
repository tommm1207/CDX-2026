/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_1584877133")

  // add field
  collection.fields.addAt(1, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text507103779",
    "max": 0,
    "min": 0,
    "name": "ten",
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
    "id": "text1696617034",
    "max": 0,
    "min": 0,
    "name": "loai_to_chuc",
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
  collection.fields.addAt(4, new Field({
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
  collection.fields.addAt(5, new Field({
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
  collection.fields.addAt(6, new Field({
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
  collection.fields.addAt(7, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text3856531757",
    "max": 0,
    "min": 0,
    "name": "chuc_vu",
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
    "id": "text2363444770",
    "max": 0,
    "min": 0,
    "name": "dien_thoai",
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
    "id": "text3885137012",
    "max": 0,
    "min": 0,
    "name": "email",
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
    "id": "text1198480871",
    "max": 0,
    "min": 0,
    "name": "website",
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
  collection.fields.addAt(12, new Field({
    "hidden": false,
    "id": "number4158220088",
    "max": null,
    "min": null,
    "name": "so_nhom_quan_ly",
    "onlyInt": false,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "number"
  }))

  // add field
  collection.fields.addAt(13, new Field({
    "hidden": false,
    "id": "number2729180863",
    "max": null,
    "min": null,
    "name": "so_ho_thanh_vien",
    "onlyInt": false,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "number"
  }))

  // add field
  collection.fields.addAt(14, new Field({
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
  collection.fields.addAt(15, new Field({
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
  collection.fields.addAt(16, new Field({
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
  collection.fields.addAt(17, new Field({
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
  collection.fields.addAt(18, new Field({
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
  collection.fields.addAt(19, new Field({
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

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_1584877133")

  // remove field
  collection.fields.removeById("text507103779")

  // remove field
  collection.fields.removeById("text1696617034")

  // remove field
  collection.fields.removeById("text696902969")

  // remove field
  collection.fields.removeById("text973649723")

  // remove field
  collection.fields.removeById("text3659602781")

  // remove field
  collection.fields.removeById("text3082544817")

  // remove field
  collection.fields.removeById("text3856531757")

  // remove field
  collection.fields.removeById("text2363444770")

  // remove field
  collection.fields.removeById("text3885137012")

  // remove field
  collection.fields.removeById("text1198480871")

  // remove field
  collection.fields.removeById("text548824989")

  // remove field
  collection.fields.removeById("number4158220088")

  // remove field
  collection.fields.removeById("number2729180863")

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

  return app.save(collection)
})
