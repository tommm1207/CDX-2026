/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_2210367014")

  // add field
  collection.fields.addAt(10, new Field({
    "hidden": false,
    "id": "number529670150",
    "max": null,
    "min": null,
    "name": "BuocSX",
    "onlyInt": false,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "number"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_2210367014")

  // remove field
  collection.fields.removeById("number529670150")

  return app.save(collection)
})
