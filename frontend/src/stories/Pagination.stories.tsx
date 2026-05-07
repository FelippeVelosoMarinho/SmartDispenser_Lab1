import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { Pagination } from "../components/ui/Pagination";

const meta = {
  title: "Components/Pagination",
  component: Pagination,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof Pagination>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { currentPage: 1, totalPages: 5, onPageChange: () => {} },
  render: () => {
    const [page, setPage] = useState(1);
    return (
      <Pagination currentPage={page} totalPages={5} onPageChange={setPage} />
    );
  },
};

export const ManyPages: Story = {
  args: { currentPage: 5, totalPages: 20, onPageChange: () => {} },
  render: () => {
    const [page, setPage] = useState(5);
    return (
      <Pagination currentPage={page} totalPages={20} onPageChange={setPage} />
    );
  },
};

export const FirstPage: Story = {
  args: { currentPage: 1, totalPages: 5, onPageChange: () => {} },
  render: () => {
    const [page, setPage] = useState(1);
    return (
      <Pagination currentPage={page} totalPages={5} onPageChange={setPage} />
    );
  },
};

export const LastPage: Story = {
  args: { currentPage: 5, totalPages: 5, onPageChange: () => {} },
  render: () => {
    const [page, setPage] = useState(5);
    return (
      <Pagination currentPage={page} totalPages={5} onPageChange={setPage} />
    );
  },
};

export const SinglePage: Story = {
  args: { currentPage: 1, totalPages: 1, onPageChange: () => {} },
  render: () => {
    const [page, setPage] = useState(1);
    return (
      <Pagination currentPage={page} totalPages={1} onPageChange={setPage} />
    );
  },
};

export const ControlledState: Story = {
  args: { currentPage: 3, totalPages: 10, onPageChange: () => {} },
  render: () => {
    const [page, setPage] = useState(3);
    const totalPages = 10;

    return (
      <div className="flex flex-col items-center gap-4">
        <p className="text-sm text-ink-3">
          Page {page} of {totalPages}
        </p>
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          onPageChange={setPage}
        />
      </div>
    );
  },
};
