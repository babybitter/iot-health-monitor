// 测试MySQL数据库连接
const mysql = require("mysql2/promise");
require("dotenv").config();

async function testConnection() {
  console.log('🔧 开始测试数据库连接...');
  
  // 方法1：使用环境变量配置
  const config1 = {
    host: process.env.DB_HOST || "localhost",
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "admin",
    database: process.env.DB_NAME || "iot_monitor"
  };
  
  console.log('📋 配置信息:', {
    host: config1.host,
    port: config1.port,
    user: config1.user,
    password: '***',
    database: config1.database
  });
  
  try {
    console.log('🔗 尝试连接方法1: 标准连接...');
    const connection1 = await mysql.createConnection(config1);
    const [rows] = await connection1.execute('SELECT 1 as test');
    console.log('✅ 方法1成功:', rows);
    await connection1.end();
    return true;
  } catch (error1) {
    console.log('❌ 方法1失败:', error1.message);
    
    // 方法2：尝试不指定数据库
    try {
      console.log('🔗 尝试连接方法2: 不指定数据库...');
      const config2 = { ...config1 };
      delete config2.database;
      
      const connection2 = await mysql.createConnection(config2);
      const [rows] = await connection2.execute('SELECT 1 as test');
      console.log('✅ 方法2成功:', rows);
      
      // 检查数据库是否存在
      const [databases] = await connection2.execute('SHOW DATABASES');
      console.log('📊 可用数据库:', databases.map(db => db.Database));
      
      await connection2.end();
      return true;
    } catch (error2) {
      console.log('❌ 方法2失败:', error2.message);
      
      // 方法3：尝试使用mysql_native_password
      try {
        console.log('🔗 尝试连接方法3: 使用native password...');
        const config3 = {
          ...config1,
          authPlugins: {
            mysql_native_password: () => require('mysql2/lib/auth_plugins').mysql_native_password
          }
        };
        delete config3.database;
        
        const connection3 = await mysql.createConnection(config3);
        const [rows] = await connection3.execute('SELECT 1 as test');
        console.log('✅ 方法3成功:', rows);
        await connection3.end();
        return true;
      } catch (error3) {
        console.log('❌ 方法3失败:', error3.message);
        console.log('🚨 所有连接方法都失败了');
        return false;
      }
    }
  }
}

// 运行测试
testConnection().then(success => {
  if (success) {
    console.log('🎉 数据库连接测试成功！');
  } else {
    console.log('💥 数据库连接测试失败！');
  }
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('💥 测试过程中发生错误:', error);
  process.exit(1);
});
