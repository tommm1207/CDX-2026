/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_2982933473")

  // add field
  collection.fields.addAt(1, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text2462958278",
    "max": 0,
    "min": 0,
    "name": "ten_dot",
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
    "id": "number4075649083",
    "max": null,
    "min": null,
    "name": "nam",
    "onlyInt": false,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "number"
  }))

  // add field
  collection.fields.addAt(3, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text559909051",
    "max": 0,
    "min": 0,
    "name": "noi_dung_gioi_thieu",
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
  collection.fields.addAt(5, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text439044434",
    "max": 0,
    "min": 0,
    "name": "nguoi_tao",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_2982933473")

  // remove field
  collection.fields.removeById("text2462958278")

  // remove field
  collection.fields.removeById("number4075649083")

  // remove field
  collection.fields.removeById("text559909051")

  // remove field
  collection.fields.removeById("text1075214571")

  // remove field
  collection.fields.removeById("text439044434")

  return app.save(collection)
})
