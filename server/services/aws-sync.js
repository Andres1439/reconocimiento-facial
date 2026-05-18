import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb";
import { getAwsConfig } from "../config/aws.js";

const config = getAwsConfig();
let docClient = null;

const syncState = {
  enabled: config.enabled,
  lastAt: null,
  lastOk: null,
  lastError: null,
  lastCounts: null,
};

function getDocClient() {
  if (!config.enabled) return null;
  if (!docClient) {
    const client = new DynamoDBClient({ region: config.region });
    docClient = DynamoDBDocumentClient.from(client);
  }
  return docClient;
}

function markResult(ok, error, counts) {
  syncState.lastAt = new Date().toISOString();
  syncState.lastOk = ok;
  syncState.lastError = error || null;
  if (counts) syncState.lastCounts = counts;
}

export function getSyncStatus() {
  return {
    enabled: syncState.enabled,
    region: config.enabled ? config.region : null,
    peopleTable: config.enabled ? config.peopleTable : null,
    attendanceTable: config.enabled ? config.attendanceTable : null,
    lastAt: syncState.lastAt,
    lastOk: syncState.lastOk,
    lastError: syncState.lastError,
    lastCounts: syncState.lastCounts,
  };
}

function runInBackground(promise) {
  promise
    .then(() => markResult(true, null))
    .catch((e) => {
      console.error("[aws-sync]", e.message || e);
      markResult(false, String(e.message || e));
    });
}

export function syncPersonToAws(person) {
  const client = getDocClient();
  if (!client || !person?.dni) return;

  runInBackground(
    client.send(
      new PutCommand({
        TableName: config.peopleTable,
        Item: {
          dni: String(person.dni),
          local_id: person.id,
          name: person.name,
          age: person.age ?? null,
          gender: person.gender ?? null,
          department: person.department ?? null,
          email: person.email ?? null,
          notes: person.notes ?? null,
          descriptor_json: person.descriptor_json,
          created_at: person.created_at,
          synced_at: new Date().toISOString(),
        },
      })
    )
  );
}

export function syncAttendanceToAws(record) {
  const client = getDocClient();
  if (!client || record?.id == null) return;

  runInBackground(
    client.send(
      new PutCommand({
        TableName: config.attendanceTable,
        Item: {
          id: String(record.id),
          person_name: record.person_name,
          event_type: record.event_type,
          created_at: record.created_at,
          synced_at: new Date().toISOString(),
        },
      })
    )
  );
}

export function deletePersonFromAws(dni) {
  const client = getDocClient();
  if (!client || !dni) return;

  runInBackground(
    client.send(
      new DeleteCommand({
        TableName: config.peopleTable,
        Key: { dni: String(dni) },
      })
    )
  );
}

export async function fullSyncFromDb(db) {
  const client = getDocClient();
  if (!client) {
    return { skipped: true, reason: "AWS no configurado" };
  }

  const people = db
    .prepare(
      `SELECT id, name, dni, age, gender, department, email, notes, descriptor_json, created_at
       FROM people WHERE dni IS NOT NULL AND dni != ''`
    )
    .all();
  const attendance = db
    .prepare(`SELECT id, person_name, event_type, created_at FROM attendance`)
    .all();

  for (const p of people) {
    await client.send(
      new PutCommand({
        TableName: config.peopleTable,
        Item: {
          dni: String(p.dni),
          local_id: p.id,
          name: p.name,
          age: p.age,
          gender: p.gender,
          department: p.department,
          email: p.email,
          notes: p.notes,
          descriptor_json: p.descriptor_json,
          created_at: p.created_at,
          synced_at: new Date().toISOString(),
        },
      })
    );
  }

  for (const a of attendance) {
    await client.send(
      new PutCommand({
        TableName: config.attendanceTable,
        Item: {
          id: String(a.id),
          person_name: a.person_name,
          event_type: a.event_type,
          created_at: a.created_at,
          synced_at: new Date().toISOString(),
        },
      })
    );
  }

  markResult(true, null, { people: people.length, attendance: attendance.length });
  return { ok: true, people: people.length, attendance: attendance.length };
}
