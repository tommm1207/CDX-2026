/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_2990748759")

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
    "hidden": false,
    "id": "json3021380965",
    "maxSize": 0,
    "name": "geojson_data",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "json"
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

  // add field
  collection.fields.addAt(4, new Field({
    "hidden": false,
    "id": "number3206337475",
    "max": null,
    "min": null,
    "name": "version",
    "onlyInt": false,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "number"
  }))

  // add field
  collection.fields.addAt(5, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text3725765462",
    "max": 0,
    "min": 0,
    "name": "created_by",
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
  const collection = app.findCollectionByNameOrId("pbc_2990748759")

  // remove field
  collection.fields.removeById("text2612221799")

  // remove field
  collection.fields.removeById("json3021380965")

  // remove field
  collection.fields.removeById("text4148968335")

  // remove field
  collection.fields.removeById("number3206337475")

  // remove field
  collection.fields.removeById("text3725765462")

  // remove field
  collection.fields.removeById("text1887391400")

  return app.save(collection)
})
