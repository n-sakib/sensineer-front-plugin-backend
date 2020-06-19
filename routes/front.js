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
                frontRes.data._results.forEach(res => {
                    customer = {};
                    customer.email = res.recipient.handle;
                    customer.conversation = {id: res.id, subject: res.subject, status:res.status, created: res.created_at}
                    allCustomers.push(customer);
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

            res.status(200)
            return res.send({status: 200, title: 'OK', customer})
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

router.get('/conversations', function (req, res) {
    let email = req.query.email;
    const urlWithOptions = createOptionForFront('GET', `${process.env.FRONT_SERVER_URL}/contacts/alt:email:${email}/conversations`)

    const getCustomerConversations = (urlWithOptions, allConversations = []) =>
        axios(urlWithOptions)
            .then(frontRes => {
                frontRes.data._results.forEach(conversation => {
                    allConversations.push({id: conversation.id, subject: conversation.subject, status: conversation.status, created:conversation.created_at});
                });
                return frontRes.data._pagination.next != null
                    ? getCustomerConversations(createOptionForFront('GET', frontRes.data._pagination.next), allConversations)
                    : Promise.resolve(allConversations)
            })
            .catch(err => {
                return Promise.reject(err)
            })

        getCustomerConversations(urlWithOptions)
        .then(conversations => {
            res.status(200)
            return res.send({status: 200, title: 'OK', conversations})
        })
        .catch((err) => {
            if(err.response && err.response.status === 401) {
                res.status(401)
                return res.send({ status: 401, title: 'Unauthorized', message: 'Please ask your system admin to renew your token!' })
            } else if (err.response && err.response.status === 404){
                res.status(200)
                return res.send({ status: 200, title: 'Not Found', message: [] })
            }
            res.status(500)
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