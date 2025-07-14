// 检查数据库数据
const mysql = require("mysql2/promise");
require("dotenv").config();

async function checkDatabase() {
  console.log('🔍 检查数据库数据...');
  
  const config = {
    host: process.env.DB_HOST || "localhost",
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "admin",
    database: process.env.DB_NAME || "iot_monitor"
  };
  
  let connection;
  try {
    connection = await mysql.createConnection(config);
    
    // 检查总记录数
    const [countResult] = await connection.execute('SELECT COUNT(*) as total FROM sensor_data');
    console.log('📊 传感器数据总记录数:', countResult[0].total);
    
    // 先检查表结构
    const [tableInfo] = await connection.execute('DESCRIBE sensor_data');
    console.log('🏗️ 表结构:');
    tableInfo.forEach(column => {
      console.log(`  ${column.Field}: ${column.Type} ${column.Null === 'YES' ? '(可空)' : '(非空)'}`);
    });

    // 检查最近的记录 - 使用实际存在的字段
    const [recentData] = await connection.execute(`
      SELECT * FROM sensor_data
      ORDER BY created_at DESC
      LIMIT 10
    `);
    
    console.log('📋 最近10条记录:');
    if (recentData.length === 0) {
      console.log('❌ 没有找到任何数据记录');
    } else {
      recentData.forEach((record, index) => {
        console.log(`${index + 1}. ID:${record.id} 设备:${record.device_id} 时间:${record.created_at}`);
        console.log(`   数据:`, record);
        console.log('');
      });
    }
    

    
  } catch (error) {
    console.error('❌ 数据库检查失败:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

checkDatabase();
