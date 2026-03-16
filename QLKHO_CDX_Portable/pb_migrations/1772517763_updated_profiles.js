/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_3414089001")

  // add field
  collection.fields.addAt(12, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text857877327",
    "max": 0,
    "min": 0,
    "name": "trach_nhiem",
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
    "id": "text138493387",
    "max": 0,
    "min": 0,
    "name": "anh_dai_dien",
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
    "id": "text3114007134",
    "max": 0,
    "min": 0,
    "name": "phan_quyen",
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
    "id": "text1233971688",
    "max": 0,
    "min": 0,
    "name": "co_quyen_xem",
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
    "id": "text2878064582",
    "max": 0,
    "min": 0,
    "name": "hoat_dong_hien_tai",
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
    "id": "text3227881172",
    "max": 0,
    "min": 0,
    "name": "ngay_bat_dau_lam_viec",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_3414089001")

  // remove field
  collection.fields.removeById("text857877327")

  // remove field
  collection.fields.removeById("text138493387")

  // remove field
  collection.fields.removeById("text3114007134")

  // remove field
  collection.fields.removeById("text1233971688")

  // remove field
  collection.fields.removeById("text2878064582")

  // remove field
  collection.fields.removeById("text3227881172")

  return app.save(collection)
})
