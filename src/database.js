const mysql = require('mysql2/promise');
const { config } = require('./config');

const dbConfig = config.db;

let pool;

function getPool() {
  if (!pool) {
    pool = mysql.createPool(dbConfig);
    console.log(`[DB] MySQL 连接池已创建: ${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`);
  }
  return pool;
}

// 执行查询的便捷方法
async function query(sql, params = []) {
  const pool = getPool();
  const [rows] = await pool.execute(sql, params);
  return rows;
}

// 执行插入并返回结果
async function insert(sql, params = []) {
  const pool = getPool();
  const [result] = await pool.execute(sql, params);
  return result;
}

// 兼容旧代码的单数据库实例获取
async function getDb() {
  const pool = getPool();
  const connection = await pool.getConnection();
  return connection;
}

module.exports = { getPool, getDb, query, insert, dbConfig };