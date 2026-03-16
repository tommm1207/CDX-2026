/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_3916463089")

  // add field
  collection.fields.addAt(25, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text1887391400",
    "max": 0,
    "min": 0,
    "name": "sb_id",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_3916463089")

  // remove field
  collection.fields.removeById("text1887391400")

  return app.save(collection)
})
