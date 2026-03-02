'use client';

export interface Column<T> {
    header: string;
    accessor: keyof T | ((row: T) => any);
    className?: string;
    render?: (value: any, row: T) => React.ReactNode;
}

interface TableProps<T> {
    columns: Column<T>[];
    data: T[];
}

export default function Table<T>({ columns, data }: TableProps<T>) {
    return (
        <div
            className="w-full overflow-hidden rounded-xl border"
            style={{ background: '#0D1117', borderColor: '#30363D' }}
        >
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead style={{ borderBottom: '1px solid #30363D', background: '#0B0E14' }}>
                        <tr>
                            {columns.map((col, index) => (
                                <th
                                    key={index}
                                    className={`px-5 py-3 text-xs uppercase tracking-widest ${col.className || ''}`}
                                    style={{ color: '#535865', fontWeight: 600 }}
                                >
                                    {col.header}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {data.map((row, rowIndex) => (
                            <tr
                                key={rowIndex}
                                className="transition-colors duration-150"
                                style={{ borderTop: rowIndex > 0 ? '1px solid #1A1F28' : undefined }}
                                onMouseEnter={e => (e.currentTarget.style.background = '#161B22')}
                                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                            >
                                {columns.map((col, colIndex) => {
                                    const value = typeof col.accessor === 'function'
                                        ? col.accessor(row)
                                        : row[col.accessor];
                                    return (
                                        <td
                                            key={colIndex}
                                            className={`px-5 py-3.5 ${col.className || ''}`}
                                            style={{ color: '#BABABA', fontWeight: 400 }}
                                        >
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