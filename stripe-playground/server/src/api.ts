import express, { NextFunction, Request, Response } from 'express';
export const app = express();

// Allows cross origin requests
import cors from 'cors';
import { createStripeCheckoutSession } from './checkout';
import { createPaymentIntent } from './payments';
import { handleStripeWebhook } from './webhooks';
import { auth } from './firebase';
import { createSetupIntent, listPaymentMethods } from './customers';
import {
  createSubscription,
  listSubscriptions,
  cancelSubscription,
} from './billing';

app.use(cors({ origin: true }));

app.use(
  express.json({
    verify: (req, res, buffer) => (req['rawBody'] = buffer),
  })
);

// Decodes the Firebase JSON Web Token
app.use(decodeJWT);

/**
 * Checkouts
 */
app.post(
  '/checkouts/',
  runAsync(async ({ body }: Request, res: Response) => {
    res.send(await createStripeCheckoutSession(body.line_items));
  })
);

app.post(
  '/payments',
  runAsync(async ({ body }: Request, res: Response) => {
    res.send(await createPaymentIntent(body.amount));
  })
);

/**
 * Customers and Setup Intents
 */

// Save a card on the customer record with a SetupIntent
app.post(
  '/wallet',
  runAsync(async (req: Request, res: Response) => {
    const user = validateUser(req);
    const setupIntent = await createSetupIntent(user.uid);
    res.send(setupIntent);
  })
);

// Retrieve all cards attached to a customer
app.get(
  '/wallet',
  runAsync(async (req: Request, res: Response) => {
    const user = validateUser(req);

    console.log('user', user);

    const wallet = await listPaymentMethods(user.uid);
    res.send(wallet.data);
  })
);

// SUBSCRIPTIONS
app.post(
  '/subscriptions/',
  runAsync(async (req: Request, res: Response) => {
    const user = validateUser(req);
    const { plan, payment_method } = req.body;
    const subscription = await createSubscription(
      user.uid,
      plan,
      payment_method
    );
    res.send(subscription);
  })
);

// Get all subscriptions for a customer
app.get(
  '/subscriptions/',
  runAsync(async (req: Request, res: Response) => {
    const user = validateUser(req);

    const subscriptions = await listSubscriptions(user.uid);

    res.send(subscriptions.data);
  })
);

// Unsubscribe or cancel a subscription
app.patch(
  '/subscriptions/:id',
  runAsync(async (req: Request, res: Response) => {
    const user = validateUser(req);
    res.send(await cancelSubscription(user.uid, req.params.id));
  })
);

app.post('/hooks', runAsync(handleStripeWebhook));

/**
 * Catch async errors when awaiting promises
 */
function runAsync(callback: Function) {
  return (req: Request, res: Response, next: NextFunction) => {
    callback(req, res, next).catch(next);
  };
}

/**
 * Throws an error if the currentUser does not exist on the request
 */
function validateUser(req: Request) {
  const user = req['currentUser'];
  if (!user) {
    throw new Error(
      'You must be logged in to make this request. i.e Authroization: Bearer <token>'
    );
  }

  return user;
}

/**
 * Decodes the JSON Web Token sent via the frontend app
 * Makes the currentUser (firebase) data available on the body.
 */
async function decodeJWT(req: Request, res: Response, next: NextFunction) {
  if (req.headers?.authorization?.startsWith('Bearer ')) {
    const idToken = req.headers.authorization.split('Bearer ')[1];

    console.log('idToken', idToken);

    try {
      const decodedToken = await auth.verifyIdToken(idToken);
      req['currentUser'] = decodedToken;
    } catch (err) {
      console.log(err);
    }
  }

  next();
}
