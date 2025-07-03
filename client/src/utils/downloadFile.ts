export function downloadFile(url: string) {
    const link = document.createElement('a');
    link.href = url;
    link.download =  'CS10.upg';
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
