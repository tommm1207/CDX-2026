/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_2254785552")

  // add field
  collection.fields.addAt(1, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text2154552535",
    "max": 0,
    "min": 0,
    "name": "nhom_tieu_chi",
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
  collection.fields.addAt(3, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text2437534344",
    "max": 0,
    "min": 0,
    "name": "phuong_phap",
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
    "id": "text3528542465",
    "max": 0,
    "min": 0,
    "name": "goi_y_bang_chung",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_2254785552")

  // remove field
  collection.fields.removeById("text2154552535")

  // remove field
  collection.fields.removeById("text2261987161")

  // remove field
  collection.fields.removeById("text2437534344")

  // remove field
  collection.fields.removeById("text3528542465")

  return app.save(collection)
})
