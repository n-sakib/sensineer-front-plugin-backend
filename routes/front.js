var express = require('express');
var router = express.Router();
const axios = require('axios');

/* GET Front APP API listing. */
router.get('/customers', function (req, res) {

    const queryString = createQueryString(req)
    const urlWithOptions = createOptionForFront('GET', `${process.env.FRONT_SERVER_URL}/conversations`, queryString)

    const getCustomerEmail = (urlWithOptions, allCustomers = []) =>
        axios(urlWithOptions)
            .then(frontRes => {
                frontRes.data._results.forEach(customer => {
                    allCustomers.push(customer.recipient.handle);
                });
                return frontRes.data._pagination.next != null
                    ? getCustomerEmail(createOptionForFront('GET', frontRes.data._pagination.next), allCustomers)
                    : Promise.resolve(allCustomers)
            })
            .catch(err => {
                return Promise.reject(err)
            })

    getCustomerEmail(urlWithOptions)
        .then(customer => {
            data = []
            var uniqueItems = [...new Set(customer)]
            uniqueItems.forEach(email => {
                data.push({email})
            })
            res.status(200)
            return res.send({status: 200, title: 'OK', data})
        })
        .catch((err) => {
            if(err.response && err.response.status === 401) {
                res.status(401)
                return res.send({ status: 401, title: 'Unauthorized', message: 'Please ask your system admin to renew your token!' })
            }
            res.status(500)
            console.log(err)
            return res.send({ status: 500, title: 'Internal server error', message: 'There is an error with the server, please try again later!' })
        });
    
    

});

createQueryString= (req) => {
    var hasQueryString = false;
    var queryString = null;

    if (req.query.q) {
        hasQueryString = true;
        queryString = '?';

        Object.keys(req.query.q).forEach((k) => {
            req.query.q[k].forEach((query) => {
                queryString = queryString + `q[${k}][]=${query}&`;
            });
        });
        return queryString.substring(0, queryString.length - 1);
    } else {
        return undefined;
    }
}

createOptionForFront = (method, frontEndPoint, queryString) => {
    var url;
    if(queryString !== undefined) {
        url = `${frontEndPoint}${queryString}`
    } else {
        url = frontEndPoint
    }
    
    return options = {
        method,
        url,
        headers: {
            'Authorization': `Bearer ${process.env.FRONT_TOKEN}`
        }
    }
}

module.exports = router;