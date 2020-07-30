var express = require('express');
var router = express.Router();
const axios = require('axios');
require('dotenv').config();

var multiSitePrefixes = process.env.WOOCOMMERCE_PREFIX.split(",");
var multisiteLogins = process.env.WOOCOMMERCE_CUSTOMER_KEY.split(",");
var multisitePasswords = process.env.WOOCOMMERCE_CUSTOMER_SECRET.split(",");
/* GET order info listing. */
router.get('/orders', function (req, res) {
    //init with .com domain
    let index = 0;
    let identifier = req.query.identifier
    let isOrder = req.query.isOrder
    let customer = {}
    let tld = []
    const urlWithOptions = createOptionForOrders('GET', multiSitePrefixes[index], multisiteLogins[index], multisitePasswords[index], identifier, isOrder)
    const getCustomerOrders = (urlWithOptions, allOrders = []) =>
        axios(urlWithOptions)
            .then(wooRes => {
                if(isOrder === "true") {
                    let order = wooRes.data;
                    allOrders.push({ id: order.id, value: order.total + order.currency_symbol, items: order.line_items, tld: multiSitePrefixes[index] })
                    customer = order.billing;
                    tld.indexOf(multiSitePrefixes[index]) === -1 ? tld.push(multiSitePrefixes[index]) : null;
                } else {
                    wooRes.data.forEach(order => {
                        //do a precidency check here
                        allOrders.push({ id: order.id, value: order.total + order.currency_symbol, items: order.line_items, tld: multiSitePrefixes[index] })
                        customer = order.billing;
                        tld.indexOf(multiSitePrefixes[index]) === -1 ? tld.push(multiSitePrefixes[index]) : null;
                    });
                }

                index = index + 1;

                return index !== multiSitePrefixes.length
                    ? getCustomerOrders(createOptionForOrders('GET', multiSitePrefixes[index], multisiteLogins[index], multisitePasswords[index], identifier, isOrder), allOrders)
                    : Promise.resolve(allOrders)
            })
            .catch(err => {
                if (isOrder && err.response.status === 404) {
                    index = index + 1;
                    return index !== multiSitePrefixes.length
                        ? getCustomerOrders(createOptionForOrders('GET', multiSitePrefixes[index], multisiteLogins[index], multisitePasswords[index], identifier, isOrder), allOrders)
                        : Promise.resolve(allOrders)
                } else {
                    return Promise.reject(err)
                }
            })

    getCustomerOrders(urlWithOptions)
        .then(orderData => {
            let data = {}
            data.customer = customer
            data.orders = orderData
            data.tlds = tld
            res.status(200)
            return res.send({ status: 200, title: 'OK', data })
        })
        .catch((err) => {
            if (err.response && err.response.status === 401) {
                res.status(401)
                return res.send({ status: 401, title: 'Unauthorized', message: 'Please ask your system admin to renew your token!' })
            }
            res.status(500)
            return res.send(err)

            // return res.send({ status: 500, title: 'Internal server error', message: 'There is an error with the server, please try again later!' })
        });
});

router.get('/post', function (req, res) {
    let index = 0;
    let orderId = req.query.orderid;

    const urlWithOptions = createOptionForPost('GET', multiSitePrefixes[index], orderId)
    const getPostId = (urlWithOptions, data) =>
        axios(urlWithOptions)
            .then(wooRes => {
                data = wooRes;
                index = index + 1;
                prefix = multiSitePrefixes[index - 1];
                id = data.data;
                if (data.data === 0) {
                    if (index !== multiSitePrefixes.length) {
                        return getPostId(createOptionForPost('GET', multiSitePrefixes[index], orderId), data)
                    } else {
                        return Promise.resolve(id)
                    }
                } else {
                    return Promise.resolve(id)
                }
            })
            .catch(err => {
                console.log(err)
                return Promise.reject(err)
            })

    getPostId(urlWithOptions)
        .then((id) => {
            res.status(200)
            return res.send({ status: 200, title: 'OK', id })
        })
        .catch((err) => {
            console.log(err)
            if (err.response && err.response.status === 401) {
                res.status(401)
                return res.send({ status: 401, title: 'Unauthorized', message: 'Please ask your system admin to renew your token!' })
            }
            res.status(500)
            // return res.send(err)
            return res.send({ status: 500, title: 'Internal server error', message: 'There is an error with the server, please try again later!' })
        });
});

createOptionForPost = (method, domain, orderId) => {
    let options = {
        method,
        url: `${process.env.WOOCOMMERCE_BASE}.${domain}/wp-json/wc/v3/post/?id=${orderId}&prefix=${domain}`
    }
    return options;
}

createOptionForOrders = (method, domain, id, pass, identifier, isOrder) => {
    var authdata = new Buffer(`${id}:${pass}`);
    let base64authdata = authdata.toString('base64');
    let options = {
        method,
        url: `${process.env.WOOCOMMERCE_BASE}.${domain}/wp-json/wc/v3/orders?search=${identifier}&per_page=100`,
        headers: {
            'Authorization': `Basic ${base64authdata}`
        }
    }

    isOrder === "true"
        ? options.url = `${process.env.WOOCOMMERCE_BASE}.${domain}/wp-json/wc/v3/orders/${identifier}`
        : options.url = `${process.env.WOOCOMMERCE_BASE}.${domain}/wp-json/wc/v3/orders?search=${identifier}&per_page=100`
    return options;
}

module.exports = {
    router
}