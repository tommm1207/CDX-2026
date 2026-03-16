/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_1374413596")

  // add field
  collection.fields.addAt(1, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text4154639732",
    "max": 0,
    "min": 0,
    "name": "id_lo_rung",
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
    "id": "text3492776706",
    "max": 0,
    "min": 0,
    "name": "hoat_dong",
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
    "id": "text3034374647",
    "max": 0,
    "min": 0,
    "name": "ngay_thuc_hien",
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
    "id": "text2261987161",
    "max": 0,
    "min": 0,
    "name": "noi_dung",
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
  collection.fields.addAt(6, new Field({
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
  collection.fields.addAt(7, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text4148968335",
    "max": 0,
    "min": 0,
    "name": "ghi_chu",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_1374413596")

  // remove field
  collection.fields.removeById("text4154639732")

  // remove field
  collection.fields.removeById("text3492776706")

  // remove field
  collection.fields.removeById("text3034374647")

  // remove field
  collection.fields.removeById("text2261987161")

  // remove field
  collection.fields.removeById("text1075214571")

  // remove field
  collection.fields.removeById("text2844665050")

  // remove field
  collection.fields.removeById("text4148968335")

  return app.save(collection)
})
