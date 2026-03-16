/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_665861042")

  // add field
  collection.fields.addAt(1, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text3752997032",
    "max": 0,
    "min": 0,
    "name": "hoat_dong_chi_tiet",
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
    "id": "text2108866674",
    "max": 0,
    "min": 0,
    "name": "nhom_hoat_dong",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_665861042")

  // remove field
  collection.fields.removeById("text3752997032")

  // remove field
  collection.fields.removeById("text2108866674")

  return app.save(collection)
})
