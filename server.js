const express = require("express");
const sql = require("mssql");
const cors = require("cors");
const bodyParser = require("body-parser");

const app = express();
const PORT = process.env.PORT || 5000; // Azure requires dynamic port

app.use(cors()); // Allow all origins, or specify frontend URL
app.use(bodyParser.json());

// Use environment variables for security
const config = {
  user: process.env.DB_USER || "blogserver",
  password: process.env.DB_PASSWORD || "lordganesha@8",
  server: process.env.DB_SERVER || "blogserverank.database.windows.net",
  database: process.env.DB_NAME || "blogdb",
  options: {
    encrypt: true,
    trustServerCertificate: false,
  },
};

let poolPromise = null;

// Connect to Azure SQL with retry
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

// ----------------- API ROUTES -----------------

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

// Get blog by ID
app.get("/api/blogs/:id", async (req, res) => {
  try {
    if (!poolPromise) throw new Error("Database connection not established");
    const pool = await poolPromise;
    const { id } = req.params;
    const result = await pool.request().query`SELECT * FROM Blogs WHERE Id = ${id}`;
    if (result.recordset.length === 0) return res.status(404).json({ error: "Blog not found" });
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
await pool.request()
  .input("title", sql.NVarChar, title)
  .input("content", sql.NVarChar(sql.MAX), content)
  .input("author", sql.NVarChar, author || "Admin")
  .input("images", sql.NVarChar(sql.MAX), imagesJSON)
  .input("mainPhoto", sql.NVarChar(sql.MAX), mainPhoto || "")
  .query`INSERT INTO Blogs (Title, Content, Author, Images, MainPhoto) 
         VALUES (@title, @content, @author, @images, @mainPhoto); 
         SELECT SCOPE_IDENTITY() AS Id`;
res.json({ id: result.recordset[0].Id, title, content, author, images, mainPhoto });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Update blog
app.put("/api/blogs/:id", async (req, res) => {
  try {
    if (!poolPromise) throw new Error("Database connection not established");
    const pool = await poolPromise;
    const { id } = req.params;
   const { title, content, author, images, mainPhoto } = req.body;
const imagesJSON = JSON.stringify(images || []);
await pool.request()
  .input("id", sql.Int, id)
  .input("title", sql.NVarChar, title)
  .input("content", sql.NVarChar(sql.MAX), content)
  .input("author", sql.NVarChar, author || "Admin")
  .input("images", sql.NVarChar(sql.MAX), imagesJSON)
  .input("mainPhoto", sql.NVarChar(sql.MAX), mainPhoto || "")
  .query`UPDATE Blogs 
         SET Title = @title, Content = @content, Author = @author, Images = @images, MainPhoto = @mainPhoto 
         WHERE Id = @id`;
res.json({ message: "Blog updated successfully", mainPhoto });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Delete blog
app.delete("/api/blogs/:id", async (req, res) => {
  try {
    if (!poolPromise) throw new Error("Database connection not established");
    const pool = await poolPromise;
    const { id } = req.params;
    const result = await pool.request()
      .input("id", sql.Int, id)
      .query`DELETE FROM Blogs WHERE Id = @id`;
    if (result.rowsAffected[0] === 0) return res.status(404).json({ error: "Blog not found" });
    res.json({ message: "Blog deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Start server
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
