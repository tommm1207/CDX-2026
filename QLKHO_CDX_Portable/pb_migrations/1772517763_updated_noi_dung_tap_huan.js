/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_3031762396")

  // add field
  collection.fields.addAt(1, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text2612221799",
    "max": 0,
    "min": 0,
    "name": "ten_lop",
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
    "id": "text507957429",
    "max": 0,
    "min": 0,
    "name": "loai_tap_huan",
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
  const collection = app.findCollectionByNameOrId("pbc_3031762396")

  // remove field
  collection.fields.removeById("text2612221799")

  // remove field
  collection.fields.removeById("text507957429")

  // remove field
  collection.fields.removeById("text4148968335")

  return app.save(collection)
})
