export async function getReadme(fullName: string) {
  let response = await fetch(`https://raw.githubusercontent.com/${fullName}/master/README`);
  if (!response.ok) {
    response = await fetch(`https://raw.githubusercontent.com/${fullName}/master/README.md`);
  }
  return response.text();
}