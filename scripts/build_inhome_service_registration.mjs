import fs from "node:fs/promises";
import path from "node:path";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const outputDir = path.resolve("outputs/inhome_service_registration");
await fs.mkdir(outputDir, { recursive: true });

const workbook = Workbook.create();
const sheet = workbook.worksheets.add("入户服务登记");
sheet.showGridLines = true;

const headers = ["序号", "日期", "房号", "清洗种类", "是否好评", "是否投票", "清洗人员", "备注"];
const rowCount = 50;

sheet.getRange("A1:H1").merge();
sheet.getRange("A1").values = [["入户服务登记"]];
sheet.getRange("A1:H1").format = {
  fill: "#174E5B",
  font: { bold: true, color: "#FFFFFF", size: 18 },
};
sheet.getRange("A1:H1").format.rowHeightPx = 38;

sheet.getRange("A2:H2").values = [headers];
sheet.getRange("A2:H2").format = {
  fill: "#D9EAD3",
  font: { bold: true, color: "#1F2933" },
};
sheet.getRange("A2:H2").format.rowHeightPx = 28;

const rows = Array.from({ length: rowCount }, (_, index) => [
  index + 1,
  null,
  "",
  "",
  "",
  "",
  "",
  "",
]);
sheet.getRange(`A3:H${rowCount + 2}`).values = rows;

sheet.getRange(`A3:A${rowCount + 2}`).format = {
  font: { color: "#1F2933" },
};
sheet.getRange(`B3:B${rowCount + 2}`).setNumberFormat("yyyy-mm-dd");
sheet.getRange(`E3:F${rowCount + 2}`).dataValidation = {
  rule: { type: "list", values: ["是", "否"] },
};

sheet.getRange(`A2:H${rowCount + 2}`).format = {
  font: { color: "#1F2933" },
  borders: {
    top: { style: "continuous", color: "#B8C4BF" },
    bottom: { style: "continuous", color: "#B8C4BF" },
    left: { style: "continuous", color: "#B8C4BF" },
    right: { style: "continuous", color: "#B8C4BF" },
  },
};

sheet.freezePanes.freezeRows(2);
sheet.getRange("A:A").format.columnWidthPx = 58;
sheet.getRange("B:B").format.columnWidthPx = 112;
sheet.getRange("C:C").format.columnWidthPx = 96;
sheet.getRange("D:D").format.columnWidthPx = 140;
sheet.getRange("E:F").format.columnWidthPx = 92;
sheet.getRange("G:G").format.columnWidthPx = 120;
sheet.getRange("H:H").format.columnWidthPx = 180;
sheet.getRange(`A3:H${rowCount + 2}`).format.rowHeightPx = 24;

const inspected = await workbook.inspect({
  kind: "table",
  range: "入户服务登记!A1:H8",
  include: "values,formulas",
  tableMaxRows: 8,
  tableMaxCols: 8,
});
console.log(inspected.ndjson);

const errors = await workbook.inspect({
  kind: "match",
  searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A",
  options: { useRegex: true, maxResults: 50 },
  summary: "final formula error scan",
});
console.log(errors.ndjson);

const xlsx = await SpreadsheetFile.exportXlsx(workbook);
await xlsx.save(path.join(outputDir, "入户服务登记.xlsx"));

const preview = await workbook.render({
  sheetName: "入户服务登记",
  range: "A1:H14",
  scale: 1,
  format: "png",
});
await fs.writeFile(path.join(outputDir, "入户服务登记_preview.png"), new Uint8Array(await preview.arrayBuffer()));
