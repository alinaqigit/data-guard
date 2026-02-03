'use client';

export interface Column<T> {
    header: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    accessor: keyof T | ((row: T) => any);
    className?: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    render?: (value: any, row: T) => React.ReactNode;
}

interface TableProps<T> {
    columns: Column<T>[];
    data: T[];
}

export default function Table<T>({ columns, data }: TableProps<T>) {
    return (
        <div className="w-full overflow-hidden rounded-2xl border border-neutral-200 dark:border-white/5 bg-white dark:bg-neutral-900/40 backdrop-blur-sm shadow-sm dark:shadow-inner dark:shadow-black/20">
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-neutral-500 dark:text-neutral-400">
                    <thead className="bg-neutral-50 dark:bg-white/5 text-xs uppercase text-neutral-500 dark:text-neutral-400 font-semibold tracking-wider">
                        <tr>
                            {columns.map((col, index) => (
                                <th key={index} className={`px-6 py-4 ${col.className || ''}`}>
                                    {col.header}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-200 dark:divide-white/5">
                        {data.map((row, rowIndex) => (
                            <tr
                                key={rowIndex}
                                className="hover:bg-neutral-50 dark:hover:bg-white/5 transition-colors duration-200"
                            >
                                {columns.map((col, colIndex) => {
                                    const value = typeof col.accessor === 'function'
                                        ? col.accessor(row)
                                        : row[col.accessor];

                                    return (
                                        <td key={colIndex} className="px-6 py-4 text-neutral-900 dark:text-white">
                                            {col.render ? col.render(value, row) : value}
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
