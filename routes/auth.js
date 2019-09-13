const express = require('express');
const { check, body } = require('express-validator');

const authController = require('../controllers/auth');

const router = express.Router();

router.get('/login', authController.getLogin);

router.get('/signup', authController.getSignup);

router.get('/reset', authController.getReset);

router.get('/reset/:token', authController.getReset);

router.post('/login', authController.postLogin);

router.post('/signup', [check('email')
        .isEmail()
        .withMessage('Please enter a valid email.')
        .custom((value, { req }) => {
            if (value === 'test@test.com') {
                throw new Error('This email address is forbidden.');
            }

            return true;
        }),
        body('password', 'Password must have at leaste 5 characters and letters and numbers')
        .isLength({ min: 5 }).isAlphanumeric()
    ],
    authController.postSignup);

router.post('/logout', authController.postLogout);

router.post('/reset', authController.postReset);

router.post('/new-password', authController.postNewPassword);

module.exports = router;