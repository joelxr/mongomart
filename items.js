/*
  Copyright (c) 2008 - 2016 MongoDB, Inc. <http://mongodb.com>

  Licensed under the Apache License, Version 2.0 (the "License")
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.
  */

var MongoClient = require('mongodb').MongoClient
var assert = require('assert')

function ItemDAO (database) {
  'use strict'

  this.db = database

  this.getCategories = function (callback) {
    'use strict'

    var categories = []
    var sum = 0

    this.db.collection('item').aggregate([
      {
        $group: {
          _id: '$category',
          num: { '$sum': 1 }
        }
      }
    ], function (err, result) {
      if (err) throw err

      for (var i = 0; i < result.length; i++) {
        var category = {
          _id: result[i]._id,
          num: result[i].num
        }

        categories.push(category)
        sum += category.num
      }

      var all = {
        _id: 'All',
        num: sum
      }

      categories.push(all)
      categories.sort(
        function (x, y) {
          return ((x._id === y._id) ? 0 : ((x._id > y._id) ? 1 : -1))
        }
      )

      callback(categories)
    })
  }

  this.getItems = function (category, page, itemsPerPage, callback) {
    'use strict'

    var pipes = [
      { $match: { 'category': category } },
      { $sort: { _id: 1 } },
      { $skip: page * itemsPerPage },
      { $limit: itemsPerPage }
    ]

    if (category === 'All') {
      pipes.splice(0, 1)
    }

    this.db.collection('item').aggregate(pipes, function (err, result) {
      if (err) throw err
      var pageItems = []

      for (var i = 0; i < result.length; i++) {
        var item = {
          _id: result[i]._id,
          title: result[i].title,
          description: result[i].description,
          slogan: result[i].slogan,
          stars: result[i].stars,
          category: result[i].category,
          img_url: result[i].img_url,
          price: result[i].price,
          reviews: result[i].reviews
        }

        pageItems.push(item)
      }

      callback(pageItems)
    })
  }

  this.getNumItems = function (category, callback) {
    'use strict'

    var pipes = [
      { $match: { 'category': category } },
      { $count: 'count' }
    ]

    if (category === 'All') {
      pipes.splice(0, 1)
    }

    this.db.collection('item').aggregate(pipes, function (err, result) {
      if (err) throw err
      var numItems = result[0].count
      callback(numItems)
    })
  }

  this.searchItems = function (query, page, itemsPerPage, callback) {
    'use strict'

    this.db.collection('item').aggregate([
      { $match: { $text: { $search: query } } },
      { $sort: { _id: 1 } },
      { $skip: page * itemsPerPage },
      { $limit: itemsPerPage }
    ], function (err, result) {
      if (err) throw err
      var items = []

      for (var i = 0; i < result.length; i++) {
        var item = {
          _id: result[i]._id,
          title: result[i].title,
          description: result[i].description,
          slogan: result[i].slogan,
          stars: result[i].stars,
          category: result[i].category,
          img_url: result[i].img_url,
          price: result[i].price,
          reviews: result[i].reviews
        }

        items.push(item)
      }

      callback(items)
    })
  }

  this.getNumSearchItems = function (query, callback) {
    'use strict'

    this.db.collection('item').aggregate([
      { $match: { $text: { $search: query } } },
      { $count: 'count' }
    ], function (err, result) {
      if (err) throw err
      var number = result[0].count
      callback(number)
    })
  }

  this.getItem = function (itemId, callback) {
    'use strict'

    this.db.collection('item').aggregate([
      { $match: { '_id': itemId } }
    ], function (err, result) {
      if (err) throw err
      var item = result[0]
      callback(item)
    })
  }

  this.getRelatedItems = function (callback) {
    'use strict'

    this.db.collection('item').find({})
      .limit(4)
      .toArray(function (err, relatedItems) {
        assert.equal(null, err)
        callback(relatedItems)
      })
  }

  this.addReview = function (itemId, comment, name, stars, callback) {
    'use strict'

    this.db.collection('item', function (err, collection) {
      assert.equal(null, err)
      collection.update(
        { _id: itemId },
        { $push:
        {
          reviews: {
            name: name,
            comment: comment,
            stars: stars,
            date: Date.now()
          }
        }
        }
      )
    })

    this.db.collection('item').find({_id: itemId})
      .toArray(function (err, doc) {
        assert.equal(null, err)
        callback(doc)
      })
  }

  this.createDummyItem = function () {
    'use strict'

    var item = {
      _id: 1,
      title: 'Gray Hooded Sweatshirt',
      description: 'The top hooded sweatshirt we offer',
      slogan: 'Made of 100% cotton',
      stars: 0,
      category: 'Apparel',
      img_url: '/img/products/hoodie.jpg',
      price: 29.99,
      reviews: []
    }

    return item
  }
}

module.exports.ItemDAO = ItemDAO
