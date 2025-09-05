const express = require("express");
const sql = require("mssql");
const cors = require("cors");
const bodyParser = require("body-parser");

const app = express();
const PORT = 5000;

app.use(cors());
app.use(bodyParser.json());

const config = {
  user: "blogserver",
  password: "lordganesha@8",
  server: "blogserverank.database.windows.net",
  database: "blogdb",
  options: {
    encrypt: true,
    trustServerCertificate: false,
  },
};

let poolPromise = null;

const connectToDb = async () => {
  try {
    poolPromise = await sql.connect(config);
    console.log("Connected to Azure SQL Database");
  } catch (err) {
    console.error("DB Connection Error:", err);
    setTimeout(connectToDb, 5000); // Retry every 5 seconds
  }
};

connectToDb();

// Get all blogs
app.get("/api/blogs", async (req, res) => {
  try {
    if (!poolPromise) throw new Error("Database connection not established");
    const pool = await poolPromise;
    const result = await pool.request().query`SELECT * FROM Blogs ORDER BY CreatedAt DESC`;
    const blogs = result.recordset.map((b) => ({
      ...b,
      images: b.Images ? JSON.parse(b.Images) : [],
    }));
    res.json(blogs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Get single blog by ID
app.get("/api/blogs/:id", async (req, res) => {
  try {
    if (!poolPromise) throw new Error("Database connection not established");
    const pool = await poolPromise;
    const { id } = req.params;
    const result = await pool.request().query`SELECT * FROM Blogs WHERE Id = ${id}`;
    if (result.recordset.length === 0) {
      return res.status(404).json({ error: "Blog not found" });
    }
    const blog = result.recordset[0];
    blog.images = blog.Images ? JSON.parse(blog.Images) : [];
    res.json(blog);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Add new blog
app.post("/api/blogs", async (req, res) => {
  try {
    if (!poolPromise) throw new Error("Database connection not established");
    const pool = await poolPromise;
    const { title, content, author, images, mainPhoto } = req.body;
    const imagesJSON = JSON.stringify(images || []);
    const result = await pool.request()
      .input("title", sql.NVarChar, title)
      .input("content", sql.NVarChar(sql.MAX), content)
      .input("author", sql.NVarChar, author || "Admin")
      .input("images", sql.NVarChar(sql.MAX), imagesJSON)
      .query`INSERT INTO Blogs (Title, Content, Author, Images) VALUES (@title, @content, @author, @images); SELECT SCOPE_IDENTITY() AS Id`;
    res.json({ id: result.recordset[0].Id, title, content, author, images });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Update a blog
app.put("/api/blogs/:id", async (req, res) => {
  try {
    if (!poolPromise) throw new Error("Database connection not established");
    const pool = await poolPromise;
    const { id } = req.params;
    const { title, content, author, images } = req.body;
    const imagesJSON = JSON.stringify(images || []);
    await pool.request()
      .input("id", sql.Int, id)
      .input("title", sql.NVarChar, title)
      .input("content", sql.NVarChar(sql.MAX), content)
      .input("author", sql.NVarChar, author || "Admin")
      .input("images", sql.NVarChar(sql.MAX), imagesJSON)
      .query`UPDATE Blogs SET Title = @title, Content = @content, Author = @author, Images = @images WHERE Id = @id`;
    res.json({ message: "Blog updated successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Delete a blog
app.delete("/api/blogs/:id", async (req, res) => {
  try {
    if (!poolPromise) throw new Error("Database connection not established");
    const pool = await poolPromise;
    const { id } = req.params;
    const result = await pool.request()
      .input("id", sql.Int, id)
      .query`DELETE FROM Blogs WHERE Id = @id`;
    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: "Blog not found" });
    }
    res.json({ message: "Blog deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));