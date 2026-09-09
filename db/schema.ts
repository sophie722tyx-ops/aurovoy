import {sqliteTable,text,integer} from 'drizzle-orm/sqlite-core';
export const works=sqliteTable('works',{
 id:text('id').primaryKey(), data:text('data').notNull(),status:text('status').notNull().default('draft'),updatedAt:text('updated_at').notNull(),updatedBy:text('updated_by').notNull()
});
export const uploads=sqliteTable('uploads',{
 id:text('id').primaryKey(),workId:text('work_id').notNull(),kind:text('kind').notNull(),objectKey:text('object_key').notNull(),uploadId:text('upload_id'),contentType:text('content_type').notNull(),size:integer('size').notNull(),owner:text('owner').notNull(),state:text('state').notNull().default('pending'),createdAt:text('created_at').notNull()
});
export const uploadParts=sqliteTable('upload_parts',{
 id:text('id').primaryKey(),uploadRef:text('upload_ref').notNull(),partNumber:integer('part_number').notNull(),etag:text('etag').notNull(),size:integer('size').notNull()
});
export const contentEntries=sqliteTable('content_entries',{
 key:text('key').primaryKey(),kind:text('kind').notNull(),data:text('data').notNull(),revision:text('revision').notNull(),updatedAt:text('updated_at').notNull(),updatedBy:text('updated_by').notNull()
});
export const contentImages=sqliteTable('content_images',{
 id:text('id').primaryKey(),entryKey:text('entry_key').notNull(),objectKey:text('object_key').notNull(),contentType:text('content_type').notNull()
});
