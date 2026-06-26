const fs = require('fs');
let schema = fs.readFileSync('db/schema.sql', 'utf8');

// replace "INT AUTO_INCREMENT PRIMARY KEY" and "BIGINT AUTO_INCREMENT PRIMARY KEY" with "VARCHAR(100) PRIMARY KEY"
schema = schema.replace(/id\` (INT|BIGINT) AUTO_INCREMENT PRIMARY KEY/g, "id` VARCHAR(100) PRIMARY KEY");

// replace "INT" with "VARCHAR(100)" for user_id, match_id, category_id, topic_id, author_id, operator_id, creator_id, required_plan_id, plan_id
const fkCols = ['user_id', 'match_id', 'category_id', 'topic_id', 'author_id', 'operator_id', 'creator_id', 'required_plan_id', 'plan_id'];
for (const col of fkCols) {
  schema = schema.replace(new RegExp(`\\\`${col}\\\` INT`, 'g'), `\`${col}\` VARCHAR(100)`);
  schema = schema.replace(new RegExp(`\\\`${col}\\\` BIGINT`, 'g'), `\`${col}\` VARCHAR(100)`);
}

fs.writeFileSync('db/schema.sql', schema);
console.log('Updated schema.sql');
