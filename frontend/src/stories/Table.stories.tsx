import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/Table";

const meta = {
  title: "Components/Table",
  component: Table,
  parameters: {
    layout: "padded",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof Table>;

export default meta;
type Story = StoryObj<typeof meta>;

const sampleData = [
  { name: "Metformin", dose: "500mg", time: "8:00 AM", status: "Taken" },
  { name: "Lisinopril", dose: "10mg", time: "9:00 AM", status: "Pending" },
  { name: "Atorvastatin", dose: "20mg", time: "9:00 PM", status: "Pending" },
];

export const Default: Story = {
  render: () => (
    <Table>
      <TableHeader>
        <TableHead>Medication</TableHead>
        <TableHead>Dose</TableHead>
        <TableHead>Time</TableHead>
        <TableHead>Status</TableHead>
      </TableHeader>
      <TableBody>
        {sampleData.map((item) => (
          <TableRow key={item.name}>
            <TableCell>{item.name}</TableCell>
            <TableCell>{item.dose}</TableCell>
            <TableCell>{item.time}</TableCell>
            <TableCell>{item.status}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  ),
};

export const WithSorting: Story = {
  render: () => {
    const [sortField, setSortField] = useState<string | null>(null);
    const [sortDir, setSortDir] = useState<"asc" | "desc" | null>(null);

    const handleSort = (field: string) => {
      if (sortField === field) {
        setSortDir(
          sortDir === "asc" ? "desc" : sortDir === "desc" ? null : "asc",
        );
        setSortField(sortDir === "desc" ? null : field);
      } else {
        setSortField(field);
        setSortDir("asc");
      }
    };

    return (
      <Table>
        <TableHeader>
          <TableHead
            sortable
            sortDirection={sortField === "name" ? sortDir : null}
            onSort={() => handleSort("name")}
          >
            Medication
          </TableHead>
          <TableHead
            sortable
            sortDirection={sortField === "dose" ? sortDir : null}
            onSort={() => handleSort("dose")}
            align="right"
          >
            Dose
          </TableHead>
        </TableHeader>
        <TableBody>
          {[...sampleData]
            .sort((a, b) => {
              if (!sortField || !sortDir) return 0;
              const cmp = a[sortField as keyof typeof a].localeCompare(
                b[sortField as keyof typeof b],
              );
              return sortDir === "asc" ? cmp : -cmp;
            })
            .map((item) => (
              <TableRow key={item.name}>
                <TableCell>{item.name}</TableCell>
                <TableCell align="right">{item.dose}</TableCell>
              </TableRow>
            ))}
        </TableBody>
      </Table>
    );
  },
};

export const WithSelectableRows: Story = {
  render: () => {
    const [selected, setSelected] = useState<string | null>(null);

    return (
      <Table>
        <TableHeader>
          <TableHead>Medication</TableHead>
          <TableHead>Dose</TableHead>
        </TableHeader>
        <TableBody>
          {sampleData.map((item) => (
            <TableRow
              key={item.name}
              selectable
              selected={selected === item.name}
              onSelect={() => setSelected(item.name)}
            >
              <TableCell>{item.name}</TableCell>
              <TableCell>{item.dose}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  },
};

export const WithNumericAlignment: Story = {
  render: () => (
    <Table>
      <TableHeader>
        <TableHead>Medication</TableHead>
        <TableHead align="right">Dose</TableHead>
      </TableHeader>
      <TableBody>
        {sampleData.map((item) => (
          <TableRow key={item.name}>
            <TableCell>{item.name}</TableCell>
            <TableCell align="right" className="font-num tabular-nums">
              {item.dose}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  ),
};

export const Compact: Story = {
  render: () => {
    const compactRows = ["A", "B", "C", "D", "E", "F", "G", "H"];
    return (
      <Table>
        <TableHeader>
          <TableHead>Name</TableHead>
          <TableHead>Value</TableHead>
        </TableHeader>
        <TableBody>
          {compactRows.map((label) => (
            <TableRow key={label}>
              <TableCell className="py-2">Row {label}</TableCell>
              <TableCell className="py-2">Data</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  },
};
