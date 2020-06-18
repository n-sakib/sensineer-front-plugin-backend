var express = require('express');
var router = express.Router();
const axios = require('axios');

var multiSitePrefixes = process.env.WOOCOMMERCE_PREFIX.split(",");
var multisiteLogins = process.env.WOOCOMMERCE_CUSTOMER_KEY.split(",");
var multisitePasswords = process.env.WOOCOMMERCE_CUSTOMER_SECRET.split(",");

/* GET order info listing. */
router.get('/orders', function (req, res) {
    //init with .com domain
    let index = 0;
    let identifier = req.query.identifier
    let customer = {}
    let tld = []
    const urlWithOptions = createOptionForOrders('GET', multiSitePrefixes[index], multisiteLogins[index], multisitePasswords[index], identifier)
    const getCustomerOrders = (urlWithOptions, allOrders = []) =>
        axios(urlWithOptions)
            .then(wooRes => {
                wooRes.data.forEach(order => {
                    allOrders.push({ id: order.id, value: order.total + order.currency_symbol, items: order.line_items, tld: multiSitePrefixes[index]})
                    customer = order.billing
                    tld.indexOf(multiSitePrefixes[index]) === -1 ? tld.push(multiSitePrefixes[index]) : null;
                });

                index = index + 1;

                return index !== multiSitePrefixes.length
                    ? getCustomerOrders(createOptionForOrders('GET', multiSitePrefixes[index], multisiteLogins[index], multisitePasswords[index], identifier), allOrders)
                    : Promise.resolve(allOrders)
            })
            .catch(err => {
                console.log(err)
                return Promise.reject(err)
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
            console.log(err)
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
    let orderId = req.query.orderid
    var authdata = new Buffer(`${multisiteLogins[0]}:${multisitePasswords[0]}`);
    let base64authdata = authdata.toString('base64');

    options = {
        method: 'get',
        url: `${process.env.WOOCOMMERCE_BASE}.com/wp-json/wc/v3/post/${orderId}`,
        headers: {
            'Authorization': `Basic ${base64authdata}`
        }
    }

    axios(options)
        .then(data => {
            data = JSON.parse(data.data)
            res.status(200)
            return res.send({ status: 200, title: 'OK', data })
        })
        .catch(err => {
            //console.log(err)
            if (err.response && err.response.status === 401) {
                res.status(401)
                return res.send({ status: 401, title: 'Unauthorized', message: 'Please ask your system admin to renew your token!' })
            }
            res.status(500)
            return res.send({status: 500, title: 'Internal Error', message: 'Internal Server Error!'})
     })

});

createOptionForOrders = (method, domain, id, pass, identifier) => {
    var authdata = new Buffer(`${id}:${pass}`);
    let base64authdata = authdata.toString('base64');
    return options = {
        method,
        url: `${process.env.WOOCOMMERCE_BASE}.${domain}/wp-json/wc/v3/orders?search=${identifier}&per_page=100`,
        headers: {
            'Authorization': `Basic ${base64authdata}`
        }
    }
}
module.exports = {
    router
}