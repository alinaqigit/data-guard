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
        <div className="w-full overflow-hidden rounded-2xl border transition-all duration-300"
            style={{
                background: 'linear-gradient(135deg, #020617 0%, #000000 100%)',
                borderColor: 'rgba(51, 65, 85, 0.3)'
            }}
        >
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-white">
                    <thead className="bg-white/5 text-sm uppercase text-neutral-400 font-black tracking-[0.1em] border-b border-white/10">
                        <tr>
                            {columns.map((col, index) => (
                                <th key={index} className={`px-5 py-4 ${col.className || ''}`}>
                                    {col.header}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
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
                                        <td key={colIndex} className="px-5 py-4 text-white font-medium">
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
