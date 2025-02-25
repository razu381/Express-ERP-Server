require("dotenv").config();
const express = require("express");
var cors = require("cors");
const jwt = require("jsonwebtoken");
const app = express();
const port = 3000;
const stripe = require("stripe")(process.env.STRIPE_SECRET);

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

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
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
    const workCollection = database.collection("work");
    const paymentCollection = database.collection("payments");

    //----------- Admin verification -------------
    async function verifyAdmin(req, res, next) {
      let email = req.decoded.email;
      let isAdmin = req.decoded.role === "Admin";
      if (!isAdmin) {
        return res.status(403).send({ message: "Forbid access" });
      }
      next();
    }
    //----------- HR verification -------------
    async function verifyHR(req, res, next) {
      let email = req.decoded.email;
      let isHR = req.decoded.role === "HR";
      if (!isHR) {
        return res.status(403).send({ message: "Forbid access" });
      }
      next();
    }
    //----------- Employee verification -------------
    async function verifyEmployee(req, res, next) {
      let email = req.decoded.email;
      let isEmployee = req.decoded.role === "Employee";
      if (!isEmployee) {
        return res.status(403).send({ message: "Forbid access" });
      }
      next();
    }

    //-------users starts---------------

    app.get("/employees-admin", verifyToken, verifyAdmin, async (req, res) => {
      let filter = {
        role: { $in: ["Employee", "HR", "fired"] },
        isVerified: true,
      };
      let result = await usersCollection.find(filter).toArray();

      res.send(result);
    });

    //get employees HR
    app.get("/employees-hr", verifyToken, verifyHR, async (req, res) => {
      let filter = { role: "Employee" };
      let result = await usersCollection.find(filter).toArray();
      res.send(result);
    });
    app.post("/users", async (req, res) => {
      let data = req.body;
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
      let email = req.params.email;
      let query = { email };

      let result = await usersCollection.findOne(query);

      res.send({ role: result?.role });
    });

    //change verification state
    app.patch("/users/:email", verifyToken, verifyHR, async (req, res) => {
      let email = req.params.email;
      let isVerified = req.body.isVerified;
      let query = { email };
      let updateDoc = {
        $set: {
          isVerified,
        },
      };

      let result = await usersCollection.updateOne(query, updateDoc);

      res.send(result);
    });

    //change role(HR/Fired)
    app.patch(
      "/users/change-role/:id",
      verifyToken,
      verifyAdmin,
      async (req, res) => {
        let id = req.params.id;
        let role = req.body.role;
        let query = { _id: new ObjectId(id) };
        let updateDoc = {
          $set: {
            role,
          },
        };

        let result = await usersCollection.updateOne(query, updateDoc);

        res.send(result);
      }
    );

    //change salary
    app.patch(
      "/users/salary/:id",
      verifyToken,
      verifyAdmin,
      async (req, res) => {
        let id = req.params.id;
        let salary = parseInt(req.body.salary);
        let query = { _id: new ObjectId(id) };
        let updateDoc = {
          $set: {
            salary,
          },
        };

        let result = await usersCollection.updateOne(query, updateDoc);
        res.send(result);
      }
    );
    //------------worksheet starts from here ----------------
    app.get(
      "/worksheet-employee/:email",
      verifyToken,
      verifyEmployee,
      async (req, res) => {
        let email = req.params.email;
        let filter = { email };
        let result = await workCollection
          .find(filter)
          .sort({ _id: -1 })
          .toArray();
        res.send(result);
      }
    );
    //all worksheet to display in hr
    app.get("/worksheet-hr", verifyToken, verifyHR, async (req, res) => {
      let result = await workCollection.find().sort({ _id: -1 }).toArray();

      res.send(result);
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
