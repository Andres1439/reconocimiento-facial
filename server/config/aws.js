export function getAwsConfig() {
  const region = process.env.AWS_REGION || "";
  const peopleTable = process.env.AWS_DYNAMODB_PEOPLE_TABLE || "";
  const attendanceTable = process.env.AWS_DYNAMODB_ATTENDANCE_TABLE || "";
  const hasCreds =
    Boolean(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) ||
    Boolean(process.env.AWS_PROFILE);

  const enabled = Boolean(region && peopleTable && attendanceTable && hasCreds);

  return {
    enabled,
    region,
    peopleTable,
    attendanceTable,
  };
}
