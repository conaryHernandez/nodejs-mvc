const mongodb = require('mongodb');
const getDb =  require('../utils/database').getDb;

class Product {
    constructor(title, price, description, imageUrl, id) {
        this.title = title;
        this.price = price;
        this.description = description;
        this.imageUrl = imageUrl;
        this._id = id;
    }

    save() {
        const db = getDb();
        let dbOpt = null;

        if (this._id) {
            dbOpt = db.collection('products').updateOne({_id: new mongodb.ObjectID(this._id)}, {$set: this})
        } else {
            dbOpt = db.collection('products')
            .insertOne(this)                
        }

        return dbOpt
        .then(result => {
            console.log(result);
        })
        .catch(err => console.log(err));
    }

    static fetchAll() {
        const db = getDb();

        return db
            .collection('products')
            .find()
            .toArray()
            .then(products => {
                return products;
            })
            .catch(err => console.log(err));
    }

    static findById(productId) {
        const db = getDb();

        return db
        .collection('products')
        .find({_id: new mongodb.ObjectID(productId)})
        .next()
        .then(product => {
            return product;
        })
        .catch(err => {
            console.log(err);
        });
    }
 }

module.exports = Product;
