/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_787165467")

  // add field
  collection.fields.addAt(1, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text3109270751",
    "max": 0,
    "min": 0,
    "name": "ten_hoat_dong",
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
    "id": "text3489252042",
    "max": 0,
    "min": 0,
    "name": "mo_ta_chi_tiet",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_787165467")

  // remove field
  collection.fields.removeById("text3109270751")

  // remove field
  collection.fields.removeById("text3489252042")

  return app.save(collection)
})
