const pool = require('../config/database');

const schema = {
  tableName: 'product_embeddings',
  columns: {
    id: 'SERIAL PRIMARY KEY',
    product_id: 'INT UNIQUE NOT NULL REFERENCES products(id) ON DELETE CASCADE',
    embedding: 'vector(2048) NOT NULL'
  }
};

class ProductEmbedding {
  static async initializePgvector() {
    const query = 'CREATE EXTENSION IF NOT EXISTS vector;';
    try {
      await pool.query(query);
      console.log('pgvector extension initialized successfully.');
    } catch (error) {
      throw new Error(`Error initializing pgvector: ${error.message}`);
    }
  }

  static async initializeTable() {
    const columns = Object.entries(schema.columns)
      .map(([name, type]) => `${name} ${type}`)
      .join(', ');
    
    const query = `
      CREATE TABLE IF NOT EXISTS ${schema.tableName} (
        ${columns}
      );
    `;
    
    try {
      await pool.query(query);
      console.log(`Table '${schema.tableName}' initialized successfully.`);
    } catch (error) {
      throw new Error(`Error initializing table: ${error.message}`);
    }
  }

  static async create(data) {
    const query = `
      INSERT INTO product_embeddings (product_id, embedding)
      VALUES ($1, $2)
      RETURNING id, product_id;
    `;
    try {
      const result = await pool.query(query, [
        data.product_id,
        JSON.stringify(data.embedding)
      ]);
      return result.rows[0];
    } catch (error) {
      throw new Error(`Error creating embedding: ${error.message}`);
    }
  }

  static async getByProductId(product_id) {
    const query = 'SELECT id, product_id, embedding FROM product_embeddings WHERE product_id = $1;';
    try {
      const result = await pool.query(query, [product_id]);
      return result.rows[0];
    } catch (error) {
      throw new Error(`Error fetching embedding: ${error.message}`);
    }
  }

  static async getAllEmbeddings() {
    const query = `
      SELECT pe.product_id, pe.embedding
      FROM product_embeddings pe
      JOIN products p ON p.id = pe.product_id;
    `;
    try {
      const result = await pool.query(query);
      return result.rows;
    } catch (error) {
      throw new Error(`Error fetching embeddings: ${error.message}`);
    }
  }

  static async update(product_id, data) {
    const query = `
      UPDATE product_embeddings
      SET embedding = $1
      WHERE product_id = $2
      RETURNING id, product_id;
    `;
    try {
      const result = await pool.query(query, [
        JSON.stringify(data.embedding),
        product_id
      ]);
      return result.rows[0];
    } catch (error) {
      throw new Error(`Error updating embedding: ${error.message}`);
    }
  }

  static async delete(product_id) {
    const query = 'DELETE FROM product_embeddings WHERE product_id = $1 RETURNING id, product_id;';
    try {
      const result = await pool.query(query, [product_id]);
      return result.rows[0];
    } catch (error) {
      throw new Error(`Error deleting embedding: ${error.message}`);
    }
  }
}

module.exports = ProductEmbedding;
module.exports.schema = schema;
