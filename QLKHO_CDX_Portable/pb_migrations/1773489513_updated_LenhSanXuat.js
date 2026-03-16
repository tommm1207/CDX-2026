/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_1742713712")

  // add field
  collection.fields.addAt(12, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text500776269",
    "max": 0,
    "min": 0,
    "name": "PhuongAn",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(13, new Field({
    "hidden": false,
    "id": "number2807605530",
    "max": null,
    "min": null,
    "name": "SoLongPerCoc",
    "onlyInt": false,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "number"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_1742713712")

  // remove field
  collection.fields.removeById("text500776269")

  // remove field
  collection.fields.removeById("number2807605530")

  return app.save(collection)
})
