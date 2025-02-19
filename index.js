require("dotenv").config();
const express = require("express");
var cors = require("cors");
const jwt = require("jsonwebtoken");
const app = express();
const port = 3000;

//middlewares
app.use(cors());
app.use(express.json());

//Token verification
function verifyToken(req, res, next) {
  if (!req?.headers?.authorization) {
    return res.status(401).send({ message: "Unauthorized access" });
  }

  let token = req.headers.authorization.split(" ")[1];
  jwt.verify(token, process.env.JWT_SECRECT, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: "Unauthorized access" });
    }
    req.decoded = decoded;
    next();
  });
}

const { MongoClient, ServerApiVersion } = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.pook9.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    //await client.connect();
    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    // console.log(
    //   "Pinged your deployment. You successfully connected to MongoDB!"
    // );

    // Get the database and collection on which to run the operation
    const database = client.db("user-management");
    const usersCollection = database.collection("users");

    //----------- Admin verification -------------
    async function verifyAdmin(req, res, next) {
      let email = req.decoded.email;
      let query = { email: email };
      let user = await usersCollection.findOne(query);

      let isAdmin = user?.role === "admin";
      if (!isAdmin) {
        return res.status(403).send({ message: "Forbid access" });
      }
      next();
    }
    //----------- HR verification -------------
    async function verifyHR(req, res, next) {
      let email = req.decoded.email;
      let query = { email: email };
      let user = await usersCollection.findOne(query);

      let isHR = user?.role === "HR";
      if (!isHR) {
        return res.status(403).send({ message: "Forbid access" });
      }
      next();
    }

    //-------users starts---------------

    app.get("/users", verifyToken, verifyAdmin, async (req, res) => {
      let result = await usersCollection.find().toArray();

      res.send(result);
    });
    app.post("/users", async (req, res) => {
      let data = req.body;
      //console.log("user post data ", data);
      let result = await usersCollection.insertOne(data);

      res.send(result);
    });
    //find user by eamil
    app.get("/users/:email", async (req, res) => {
      let email = req.params.email;
      let query = { email };

      let result = await usersCollection.findOne(query);
      res.send(result);
    });

    //---------------- check User role by email ----------
    app.get("/users/role/:email", async (req, res) => {
      console.log("role was hit");
      let email = req.params.email;
      let query = { email };

      let result = await usersCollection.findOne(query);

      res.send({ role: result.role });
    });

    ///------------- start of jwt ------------------
    app.post("/jwt", async (req, res) => {
      let user = req.body;
      let token = jwt.sign(user, process.env.JWT_SECRECT);

      res.send({ token });
    });
  } finally {
    // Ensures that the client will close when you finish/error
    //await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
